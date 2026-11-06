import { describe, expect, it } from "vitest";
import { findLeakedKeys } from "./leaked-env-keys.mjs";

describe("findLeakedKeys", () => {
  it("passes an empty bundle", () => {
    expect(findLeakedKeys({ production: {}, development: {}, test: {} })).toEqual([]);
  });

  it("allows public variables", () => {
    expect(findLeakedKeys({ production: { NEXT_PUBLIC_APP_NAME: "x" } })).toEqual([]);
  });

  it("flags private variables in any mode, once each", () => {
    const env = {
      production: { DATABASE_URL: "a", NEXT_PUBLIC_APP_NAME: "x" },
      development: { DATABASE_URL: "a", API_KEY: "b" },
    };
    expect(findLeakedKeys(env)).toEqual(["API_KEY", "DATABASE_URL"]);
  });
});
