import { describe, expect, it } from "vitest";
import { resolveConnectionString } from "./connection";

describe("resolveConnectionString", () => {
  it("prefers Hyperdrive over DATABASE_URL", () => {
    expect(resolveConnectionString({ hyperdrive: "hyper", databaseUrl: "direct" })).toBe("hyper");
  });

  it("falls back to DATABASE_URL for local development", () => {
    expect(resolveConnectionString({ databaseUrl: "direct" })).toBe("direct");
  });

  it("treats an empty value as missing", () => {
    expect(resolveConnectionString({ hyperdrive: "", databaseUrl: "direct" })).toBe("direct");
  });

  it("throws, without echoing any value, when nothing is configured", () => {
    expect(() => resolveConnectionString({})).toThrow(/No database connection/);
  });
});
