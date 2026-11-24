/**
 * Maps rows copied from the RLA SEO strategy sheet to strategies. Pure, with
 * type-only imports, so scripts/import-strategies.mjs can load it with Node's
 * type stripping. Tested in sheet.test.ts.
 *
 * Columns, in sheet order (the header row, if pasted, is skipped):
 *  0 Priority          5 End date        10 Owner             15 Next steps
 *  1 Goal type         6 Next review     11 Work progress %   16 Outcome
 *  2 Initiative        7 Duration        12 Status            17 Expected impact
 *  3 Action            8 KPI target      13 Work completed    18 Time to impact
 *  4 Start date        9 KPI current     14 Evidence link     19 Task link
 *
 * Priority and goal type are merged cells in the sheet: a blank cell repeats
 * the value above it.
 */

export interface StrategyInput {
  sourceKey: string;
  sortOrder: number;
  priority: string;
  goalType: string;
  initiative: string;
  action: string | null;
  startDate: string | null;
  endDate: string | null;
  nextReview: string | null;
  duration: string | null;
  kpiTarget: string | null;
  kpiCurrent: string | null;
  owner: string | null;
  workProgress: number | null;
  status: string;
  workCompleted: string | null;
  evidenceUrl: string | null;
  nextSteps: string | null;
  outcome: string | null;
  expectedImpact: string | null;
  timeToImpact: string | null;
  taskUrl: string | null;
}

export interface RowMessage {
  rowNumber: number;
  message: string;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const text = (value: string | undefined) => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

const url = (value: string | undefined) => {
  const trimmed = text(value);
  return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : null;
};

/** "May 18, 2026", "2026-05-18" or "5/18/2026" → "2026-05-18"; anything else → null. */
export function parseSheetDate(value: string | undefined): string | null {
  const raw = text(value);
  if (!raw) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const valid = (y: number, m: number, d: number) => {
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
  };
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (match) return valid(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (match) return valid(Number(match[3]), Number(match[1]), Number(match[2]));
  match = /^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(raw);
  if (match) {
    const month = MONTHS.indexOf(match[1]!.slice(0, 3).toLowerCase()) + 1;
    return month > 0 ? valid(Number(match[3]), month, Number(match[2])) : null;
  }
  return null;
}

/** "30%" or "30" → 30, clamped to 0-100; blank or unreadable → null. */
export function parsePercent(value: string | undefined): number | null {
  const raw = text(value);
  if (!raw) return null;
  const number = Number(raw.replace(/%$/, "").trim());
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : null;
}

/** A bare number of days, such as "45", reads as "45 days". */
function duration(value: string | undefined): string | null {
  const raw = text(value);
  return raw && /^\d+$/.test(raw) ? `${raw} days` : raw;
}

const keyPart = (value: string | null) => (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();

function isHeader(row: readonly string[]): boolean {
  return /priority/i.test(row[0] ?? "") && /goal/i.test(row[1] ?? "");
}

export function mapStrategyRows(rows: readonly (readonly string[])[]): {
  strategies: StrategyInput[];
  skipped: RowMessage[];
  warnings: RowMessage[];
} {
  const strategies: StrategyInput[] = [];
  const skipped: RowMessage[] = [];
  const warnings: RowMessage[] = [];
  const seen = new Set<string>();
  let priority: string | null = null;
  let goalType: string | null = null;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    if (row.every((cell) => !cell.trim())) return;
    if (isHeader(row)) return;

    priority = text(row[0]) ?? priority;
    goalType = text(row[1]) ?? goalType;
    const initiative = text(row[2]);
    const action = text(row[3]);
    if (!initiative && !action) {
      skipped.push({ rowNumber, message: "no initiative or action" });
      return;
    }
    if (!priority || !goalType) {
      skipped.push({ rowNumber, message: "no priority or goal type above it" });
      return;
    }

    const sourceKey = [priority, goalType, initiative, action].map(keyPart).join("|");
    if (seen.has(sourceKey)) {
      skipped.push({ rowNumber, message: `duplicate of an earlier row (${initiative ?? action})` });
      return;
    }
    seen.add(sourceKey);

    for (const [column, label] of [
      [4, "start date"],
      [5, "end date"],
      [6, "next review"],
    ] as const) {
      if (text(row[column]) && !parseSheetDate(row[column])) {
        warnings.push({ rowNumber, message: `could not read the ${label} "${row[column]}"` });
      }
    }

    strategies.push({
      sourceKey,
      sortOrder: strategies.length,
      priority,
      goalType,
      // A row with only an action still needs a title.
      initiative: initiative ?? action!,
      action: initiative ? action : null,
      startDate: parseSheetDate(row[4]),
      endDate: parseSheetDate(row[5]),
      nextReview: parseSheetDate(row[6]),
      duration: duration(row[7]),
      kpiTarget: text(row[8]),
      kpiCurrent: text(row[9]),
      owner: text(row[10]),
      workProgress: parsePercent(row[11]),
      status: text(row[12]) ?? "Planned",
      workCompleted: text(row[13]),
      evidenceUrl: url(row[14]),
      nextSteps: text(row[15]),
      outcome: text(row[16]),
      expectedImpact: text(row[17]),
      timeToImpact: text(row[18]),
      taskUrl: url(row[19]),
    });
  });

  return { strategies, skipped, warnings };
}
