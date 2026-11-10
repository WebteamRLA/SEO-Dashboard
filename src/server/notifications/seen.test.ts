import { describe, expect, it } from "vitest";
import { parseSeenAt } from "./seen";

const now = Date.parse("2026-11-10T12:00:00.000Z");

describe("parseSeenAt", () => {
  it("accepts a past timestamp and normalises it", () => {
    expect(parseSeenAt("2026-11-09T08:00:00Z", now)).toBe("2026-11-09T08:00:00.000Z");
  });

  it("treats a missing or malformed cookie as never seen", () => {
    expect(parseSeenAt(undefined, now)).toBeNull();
    expect(parseSeenAt("", now)).toBeNull();
    expect(parseSeenAt("not a date", now)).toBeNull();
  });

  it("rejects a time in the future, beyond a little clock skew", () => {
    expect(parseSeenAt("2026-11-10T12:04:00.000Z", now)).toBe("2026-11-10T12:04:00.000Z");
    expect(parseSeenAt("2027-01-01T00:00:00.000Z", now)).toBeNull();
  });
});
