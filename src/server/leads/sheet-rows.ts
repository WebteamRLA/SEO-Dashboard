/**
 * Maps rows of Courtney's leads Google Sheet to lead records.
 *
 * Pure and free of runtime imports: `scripts/import-leads.mjs` loads this file
 * directly with Node's type stripping, and the in-app sheet sync will reuse it.
 * So only erasable TypeScript here (no enums, no runtime `import`).
 *
 * Columns are read by position. The sheet's header row does not describe its
 * values (the "Project Budget" column holds how the person found RLA, "Prospect
 * Source" holds the deal status), so headers are ignored.
 */

import type { LeadSource, PipelineStage } from "@/lib/types/leads";

/** The sheet's columns, in order. */
export const SHEET_COLUMNS = [
  "date",
  "name",
  "email",
  "company",
  "heardFrom",
  "services",
  "channel",
  "status",
  "note",
  "closeDate",
  "revenue1",
  "commission1",
  "revenue2",
  "commission2",
  "revenue3",
  "commission3",
  "revenue4",
  "commission4",
  /** A formula over the commission cells; recalculated, never imported. */
  "totalCommission",
] as const;
export type SheetColumn = (typeof SHEET_COLUMNS)[number];

const PAYMENT_SEQUENCES = [1, 2, 3, 4] as const;

/** The same values as `LEAD_SOURCES`; a type, so this file keeps no runtime imports. */
export type LeadChannel = LeadSource;

/** Sheet status → dashboard stage. Lower-case keys. */
const STATUS_TO_STAGE: Record<string, PipelineStage> = {
  "": "new",
  "reached out": "contacted",
  "provided quote": "proposal",
  "signed proposal won": "won",
  lost: "lost",
};

/** Sheet channel → dashboard channel. Lower-case keys. */
const CHANNEL_ALIASES: Record<string, LeadChannel> = {
  "": "Unknown",
  unknown: "Unknown",
  "organic search": "Organic Search",
  organic: "Organic Search",
  "ai search": "AI Search",
  referral: "Referral",
  ad: "Paid Search",
  ads: "Paid Search",
  "paid search": "Paid Search",
  social: "Social",
  direct: "Direct",
  email: "Email",
};

export interface SheetPayment {
  /** 1 to 4: the sheet's "Revenue Month N" / "Commission Month N" pair. */
  sequence: number;
  /** Decimal string with two places, such as "6250.00". */
  amount: string;
  commission: string | null;
}

export interface SheetLead {
  rowKey: string;
  /** 1-based row number in the input, for messages. */
  rowNumber: number;
  /** ISO 8601 in UTC, or null when the row has no usable date. */
  submittedAt: string | null;
  name: string | null;
  email: string | null;
  company: string | null;
  heardFrom: string | null;
  services: string | null;
  channel: LeadChannel;
  stage: PipelineStage;
  pipelineNote: string | null;
  /** YYYY-MM-DD, or null. */
  wonOn: string | null;
  payments: SheetPayment[];
  /** The row's cells by column, as they appeared in the sheet. */
  raw: Record<SheetColumn, string>;
}

export interface SheetIssue {
  rowNumber: number;
  message: string;
}

export interface SheetMapResult {
  leads: SheetLead[];
  /** Rows not imported, with the reason. Blank rows and the header are not listed. */
  skipped: SheetIssue[];
  /** Rows imported with a value that could not be read. */
  warnings: SheetIssue[];
}

export interface SheetMapOptions {
  /** IANA zone the sheet's dates are written in, such as "America/New_York". */
  timeZone: string;
}

// ---------------------------------------------------------------------------
// Delimited text
// ---------------------------------------------------------------------------

/**
 * Parses CSV (delimiter ",") or a Google Sheets copy-paste / TSV export
 * (delimiter "\t"). Handles quoted cells, doubled quotes, and line breaks
 * inside quotes, which is how Sheets writes multi-line cells.
 */
export function parseDelimited(text: string, delimiter: "," | "\t"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let atCellStart = true;

  const source = text.replace(/^﻿/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"' && atCellStart) {
      quoted = true;
      atCellStart = false;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
      atCellStart = true;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      atCellStart = true;
    } else {
      cell += char;
      atCellStart = false;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Reads the date formats the sheet uses: "2026-11-03 19:30:56" (form
 * timestamps), "Jun 30, 2026" (typed by hand), and "10/26/2025" (US order).
 */
export function parseSheetDate(value: string): WallTime | null {
  const text = value.trim();
  let year: number;
  let month: number;
  let day: number;
  let hour = 0;
  let minute = 0;
  let second = 0;

  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
    hour = Number(match[4] ?? 0);
    minute = Number(match[5] ?? 0);
    second = Number(match[6] ?? 0);
  } else if ((match = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(text))) {
    const index = MONTHS.indexOf(match[1]!.slice(0, 3).toLowerCase());
    if (index === -1) return null;
    year = Number(match[3]);
    month = index + 1;
    day = Number(match[2]);
  } else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text))) {
    year = Number(match[3]);
    month = Number(match[1]);
    day = Number(match[2]);
  } else {
    return null;
  }

  if (!isValidDate(year, month, day) || hour > 23 || minute > 59 || second > 59) return null;
  return { year, month, day, hour, minute, second };
}

/** The UTC offset of `timeZone` at `instant`, in milliseconds. */
function zoneOffset(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Converts a wall-clock time in `timeZone` to a UTC ISO string. */
export function wallTimeToIso(time: WallTime, timeZone: string): string {
  const naive = Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, time.second);
  // Two passes settle the offset across a daylight-saving change.
  let instant = naive - zoneOffset(naive, timeZone);
  instant = naive - zoneOffset(instant, timeZone);
  return new Date(instant).toISOString();
}

/** "$6,250.00", "3,354.84", "740" → "6250.00". Null when blank or unreadable. */
export function parseMoney(value: string): string | null {
  const text = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return `${whole!.replace(/^0+(?=\d)/, "")}.${fraction.padEnd(2, "0")}`;
}

function isZero(amount: string | null): boolean {
  return amount === null || /^0+\.00$/.test(amount);
}

function clean(value: string): string | null {
  const text = value.replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
}

/** FNV-1a, 64-bit. Stable across runs and machines. */
const FNV_OFFSET = BigInt("0xcbf29ce484222325");
const FNV_PRIME = BigInt("0x100000001b3");
const MASK_64 = BigInt("0xffffffffffffffff");

function hash64(text: string): string {
  let hash = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash.toString(16).padStart(16, "0");
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function isHeaderRow(cells: string[]): boolean {
  return cells[0]?.trim().toLowerCase() === "date" && (cells[1] ?? "").toLowerCase().includes("name");
}

export function mapSheetRows(rows: string[][], options: SheetMapOptions): SheetMapResult {
  const leads: SheetLead[] = [];
  const skipped: SheetIssue[] = [];
  const warnings: SheetIssue[] = [];
  const seenKeys = new Map<string, number>();

  rows.forEach((cells, index) => {
    const rowNumber = index + 1;
    if (cells.every((cell) => cell.trim() === "")) return;
    if (isHeaderRow(cells)) return;

    const warn = (message: string) => warnings.push({ rowNumber, message });
    if (cells.length > SHEET_COLUMNS.length && cells.slice(SHEET_COLUMNS.length).some((cell) => cell.trim())) {
      warn(`Has ${cells.length} columns; only the first ${SHEET_COLUMNS.length} are read.`);
    }

    const raw = Object.fromEntries(
      SHEET_COLUMNS.map((column, position) => [column, cells[position] ?? ""]),
    ) as Record<SheetColumn, string>;

    const name = clean(raw.name);
    const company = clean(raw.company);
    let email = clean(raw.email)?.toLowerCase() ?? null;
    if (!name && !email && !company) {
      skipped.push({ rowNumber, message: "No name, email, or company." });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      warn(`Email "${raw.email.trim()}" is not a valid address; left empty.`);
      email = null;
    }

    let submittedAt: string | null = null;
    if (clean(raw.date)) {
      const time = parseSheetDate(raw.date);
      if (time) submittedAt = wallTimeToIso(time, options.timeZone);
      else warn(`Date "${raw.date.trim()}" could not be read; left empty.`);
    }

    const statusKey = (clean(raw.status) ?? "").toLowerCase();
    let stage = STATUS_TO_STAGE[statusKey];
    if (!stage) {
      warn(`Status "${raw.status.trim()}" is not recognised; imported as New.`);
      stage = "new";
    }

    const channelKey = (clean(raw.channel) ?? "").toLowerCase();
    let channel = CHANNEL_ALIASES[channelKey];
    if (!channel) {
      warn(`Channel "${raw.channel.trim()}" is not recognised; imported as Unknown.`);
      channel = "Unknown";
    }

    let wonOn: string | null = null;
    if (clean(raw.closeDate)) {
      const time = parseSheetDate(raw.closeDate);
      if (time) {
        wonOn = `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
      } else {
        warn(`Close date "${raw.closeDate.trim()}" could not be read; left empty.`);
      }
    }
    if (stage === "won" && !wonOn) warn("Won, but has no close date, so it is missing from revenue by month.");

    const payments: SheetPayment[] = [];
    const readMoney = (column: SheetColumn): string | null => {
      if (!clean(raw[column])) return null;
      const amount = parseMoney(raw[column]);
      if (amount === null) warn(`Amount "${raw[column].trim()}" could not be read; left empty.`);
      return amount;
    };
    for (const sequence of PAYMENT_SEQUENCES) {
      const revenue = readMoney(`revenue${sequence}`);
      const commission = readMoney(`commission${sequence}`);
      if (!isZero(revenue)) {
        payments.push({ sequence, amount: revenue!, commission: isZero(commission) ? null : commission });
      } else if (!isZero(commission)) {
        warn(`Has a Month ${sequence} commission but no revenue; the commission was not imported.`);
      }
    }
    if (payments.length > 0 && stage !== "won") warn("Has revenue but is not marked Won.");

    // Identity: the cells least likely to be edited. A duplicate row gets a suffix.
    const identity = [raw.date, raw.name, raw.email, raw.company]
      .map((value) => value.replace(/\s+/g, " ").trim().toLowerCase())
      .join("\u001f");
    const baseKey = hash64(identity);
    const seen = seenKeys.get(baseKey) ?? 0;
    seenKeys.set(baseKey, seen + 1);
    const rowKey = seen === 0 ? baseKey : `${baseKey}-${seen + 1}`;

    leads.push({
      rowKey,
      rowNumber,
      submittedAt,
      name,
      email,
      company,
      heardFrom: clean(raw.heardFrom),
      services: clean(raw.services),
      channel,
      stage,
      pipelineNote: clean(raw.note),
      wonOn,
      payments,
      raw,
    });
  });

  return { leads, skipped, warnings };
}
