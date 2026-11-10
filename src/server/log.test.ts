import { describe, expect, it } from "vitest";
import { describeError } from "./log";

describe("describeError", () => {
  it("keeps the name and code but never the message", () => {
    const error = Object.assign(new Error("Invalid value for email: ada@acme.example"), { name: "PrismaClientValidationError", code: "P2009" });
    expect(describeError(error)).toBe("PrismaClientValidationError (P2009)");
    expect(describeError(new TypeError("secret detail"))).toBe("TypeError");
    expect(describeError("text")).toBe("unknown error");
  });
});
