import { describe, expect, it } from "vitest";
import { mapSheetRows, parseDelimited, parseMoney, parseSheetDate, wallTimeToIso } from "./sheet-rows";

// Made-up people only: this repository is public.
const NY = { timeZone: "America/New_York" };

/** Builds a full-width row from the cells that matter. */
function row(cells: Partial<Record<number, string>>): string[] {
  return Array.from({ length: 19 }, (_, index) => cells[index] ?? "");
}

describe("parseDelimited", () => {
  it("reads a tab-separated paste with empty trailing cells", () => {
    expect(parseDelimited("a\tb\t\t\nc\t\td\n", "\t")).toEqual([
      ["a", "b", "", ""],
      ["c", "", "d"],
    ]);
  });

  it("reads quoted CSV cells with commas, quotes, and line breaks", () => {
    expect(parseDelimited('x,"$6,250.00","said ""hi""\nthen left"\r\ny,1,2', ",")).toEqual([
      ["x", "$6,250.00", 'said "hi"\nthen left'],
      ["y", "1", "2"],
    ]);
  });
});

describe("parseSheetDate", () => {
  it("reads form timestamps, typed dates, and US dates", () => {
    expect(parseSheetDate("2026-11-03 19:30:56")).toEqual({ year: 2026, month: 11, day: 3, hour: 19, minute: 30, second: 56 });
    expect(parseSheetDate("2026-10-20 8:12:05")?.hour).toBe(8);
    expect(parseSheetDate("Jun 30, 2026")).toMatchObject({ year: 2026, month: 6, day: 30, hour: 0 });
    expect(parseSheetDate("September 3, 2025")).toMatchObject({ year: 2025, month: 9, day: 3 });
    expect(parseSheetDate("10/26/2025")).toMatchObject({ year: 2025, month: 10, day: 26 });
  });

  it("rejects impossible or unknown dates", () => {
    expect(parseSheetDate("Feb 30, 2026")).toBeNull();
    expect(parseSheetDate("13/01/2026")).toBeNull();
    expect(parseSheetDate("soon")).toBeNull();
  });
});

describe("wallTimeToIso", () => {
  it("applies the zone's offset, including daylight saving", () => {
    const base = { minute: 0, second: 0 };
    expect(wallTimeToIso({ year: 2026, month: 1, day: 15, hour: 9, ...base }, "America/New_York")).toBe("2026-01-15T14:00:00.000Z");
    expect(wallTimeToIso({ year: 2026, month: 7, day: 15, hour: 9, ...base }, "America/New_York")).toBe("2026-07-15T13:00:00.000Z");
    expect(wallTimeToIso({ year: 2026, month: 7, day: 15, hour: 9, ...base }, "UTC")).toBe("2026-07-15T09:00:00.000Z");
  });
});

describe("parseMoney", () => {
  it("normalises the formats the sheet uses", () => {
    expect(parseMoney("$6,250.00")).toBe("6250.00");
    expect(parseMoney("3,354.84")).toBe("3354.84");
    expect(parseMoney("740")).toBe("740.00");
    expect(parseMoney("$74.5")).toBe("74.50");
    expect(parseMoney("about 500")).toBeNull();
  });
});

describe("mapSheetRows", () => {
  it("maps a form row and skips the header and blank rows", () => {
    const result = mapSheetRows(
      [
        ["Date", "Prospect Name", "Email"],
        row({ 0: "2026-10-28 14:01:42", 1: "Ada Example", 2: " Ada@Example.COM ", 3: "Example Co", 4: "ChatGPT", 6: "AI Search", 7: "Signed Proposal Won", 9: "11/02/2026", 10: "$1,200.00", 11: "$120.00" }),
        row({}),
      ],
      NY,
    );
    expect(result.skipped).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.leads).toHaveLength(1);
    expect(result.leads[0]).toMatchObject({
      rowNumber: 2,
      submittedAt: "2026-10-28T18:01:42.000Z",
      name: "Ada Example",
      email: "ada@example.com",
      company: "Example Co",
      heardFrom: "ChatGPT",
      channel: "AI Search",
      stage: "won",
      wonOn: "2026-11-02",
      payments: [{ sequence: 1, amount: "1200.00", commission: "120.00" }],
    });
  });

  it("maps every status and channel the sheet uses", () => {
    const statuses = ["", "Reached Out", "Provided Quote", "Signed Proposal Won", "Lost"];
    const { leads } = mapSheetRows(statuses.map((status, i) => row({ 1: `Person ${i}`, 7: status })), NY);
    expect(leads.map((lead) => lead.stage)).toEqual(["new", "contacted", "proposal", "won", "lost"]);

    const channels = ["Organic Search", "AI Search", "Referral", "Ad", "Unknown", ""];
    const mapped = mapSheetRows(channels.map((channel, i) => row({ 1: `Person ${i}`, 6: channel })), NY).leads;
    expect(mapped.map((lead) => lead.channel)).toEqual(["Organic Search", "AI Search", "Referral", "Paid Search", "Unknown", "Unknown"]);
  });

  it("reads up to four payments, ignoring the total and unreadable cells", () => {
    const { leads, warnings } = mapSheetRows(
      [row({ 3: "client.example", 7: "Signed Proposal Won", 9: "10/26/2025", 10: "$100.00", 11: "$10.00", 12: "$100.00", 13: "$10.00", 14: "$50.00", 15: "$5.00", 16: "Paid in two parts", 17: "#VALUE!", 18: "#VALUE!" })],
      NY,
    );
    expect(leads[0]!.payments).toEqual([
      { sequence: 1, amount: "100.00", commission: "10.00" },
      { sequence: 2, amount: "100.00", commission: "10.00" },
      { sequence: 3, amount: "50.00", commission: "5.00" },
    ]);
    expect(warnings.map((w) => w.message)).toEqual([
      'Amount "Paid in two parts" could not be read; left empty.',
      'Amount "#VALUE!" could not be read; left empty.',
    ]);
  });

  it("keeps two payments and ignores zero commissions on lost leads", () => {
    const { leads, warnings } = mapSheetRows(
      [
        row({ 0: "Sep 23, 2025", 3: "client.example", 6: "AI Search", 7: "Signed Proposal Won", 9: "10/26/2025", 10: "$6,250.00", 11: "$625.00", 12: "$6,250.00" }),
        row({ 0: "Jan 31, 2026", 3: "Someone - other.example", 6: "Organic Search", 7: "Lost", 8: "Ghosted", 11: "$0.00" }),
      ],
      NY,
    );
    expect(warnings).toEqual([]);
    expect(leads[0]!.payments).toEqual([
      { sequence: 1, amount: "6250.00", commission: "625.00" },
      { sequence: 2, amount: "6250.00", commission: null },
    ]);
    expect(leads[1]).toMatchObject({ stage: "lost", pipelineNote: "Ghosted", payments: [] });
  });

  it("imports what it can and warns about the rest", () => {
    const { leads, warnings, skipped } = mapSheetRows(
      [
        row({ 0: "someday", 1: "Bo Example", 2: "not-an-email", 6: "Billboard", 7: "Thinking", 10: "lots" }),
        row({ 1: "Cy Example", 7: "Signed Proposal Won", 10: "740", 11: "$74.00" }),
        row({ 8: "A note with nobody attached" }),
      ],
      NY,
    );
    expect(leads[0]).toMatchObject({ submittedAt: null, email: null, channel: "Unknown", stage: "new", payments: [] });
    expect(warnings.filter((w) => w.rowNumber === 1)).toHaveLength(5);
    expect(warnings).toContainEqual({ rowNumber: 2, message: "Won, but has no close date, so it is missing from revenue by month." });
    expect(skipped).toEqual([{ rowNumber: 3, message: "No name, email, or company." }]);
  });

  it("gives each row a stable key, and a suffix to exact duplicates", () => {
    const first = row({ 0: "Jun 1, 2026", 1: "Di Example", 7: "Lost" });
    const keys = mapSheetRows([first, first], NY).leads.map((lead) => lead.rowKey);
    expect(keys[1]).toBe(`${keys[0]}-2`);

    // Status changes do not change identity, so a re-import updates the same lead.
    const moved = row({ 0: "Jun 1, 2026", 1: "Di Example", 7: "Reached Out" });
    expect(mapSheetRows([moved], NY).leads[0]!.rowKey).toBe(keys[0]);
  });
});
