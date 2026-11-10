import { describe, expect, it } from "vitest";
import type { NotificationPreference } from "@/lib/types";
import { mergePreferences, preferenceChangeSchema, wants } from "./preferences";

const catalog: NotificationPreference[] = [
  { id: "new-lead", label: "New lead", description: "", email: true, inApp: true, available: true, phase: "P1" },
  { id: "report-ready", label: "Report", description: "", email: false, inApp: false, available: false, phase: "P2" },
];

describe("mergePreferences", () => {
  it("uses the defaults when nothing is saved", () => {
    expect(mergePreferences(catalog, [])).toEqual(catalog);
  });

  it("applies saved choices to delivered events only", () => {
    const merged = mergePreferences(catalog, [
      { eventId: "new-lead", email: false, inApp: true },
      { eventId: "report-ready", email: true, inApp: true },
    ]);
    expect(merged[0]).toMatchObject({ email: false, inApp: true });
    expect(merged[1]).toMatchObject({ email: false, inApp: false });
  });

  it("does not change the catalog it was given", () => {
    mergePreferences(catalog, [{ eventId: "new-lead", email: false, inApp: false }]);
    expect(catalog[0]).toMatchObject({ email: true, inApp: true });
  });
});

describe("wants", () => {
  it("follows the saved choice, else the default, and is false for unknown events", () => {
    expect(wants(catalog, [], "new-lead", "email")).toBe(true);
    expect(wants(catalog, [{ eventId: "new-lead", email: false, inApp: true }], "new-lead", "email")).toBe(false);
    expect(wants(catalog, [], "nope", "inApp")).toBe(false);
  });
});

describe("preferenceChangeSchema", () => {
  it("accepts a channel toggle and rejects anything else", () => {
    expect(preferenceChangeSchema.safeParse({ eventId: "new-lead", channel: "email", enabled: false }).success).toBe(true);
    expect(preferenceChangeSchema.safeParse({ eventId: "new-lead", channel: "sms", enabled: false }).success).toBe(false);
    expect(preferenceChangeSchema.safeParse({ eventId: "new-lead", channel: "email", enabled: "yes" }).success).toBe(false);
  });
});
