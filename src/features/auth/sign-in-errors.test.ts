import { describe, expect, it } from "vitest";
import { signInErrorMessage } from "./sign-in-errors";

describe("signInErrorMessage", () => {
  it("returns nothing without an error", () => {
    expect(signInErrorMessage(undefined)).toBeNull();
    expect(signInErrorMessage("")).toBeNull();
  });

  it("explains known codes", () => {
    expect(signInErrorMessage("NOT_INVITED")).toMatch(/admin to invite you/);
    expect(signInErrorMessage("access_denied")).toBe("Sign-in was cancelled.");
  });

  it("never echoes an unknown code", () => {
    const message = signInErrorMessage("<script>alert(1)</script>");
    expect(message).toBe("Sign-in didn't complete. Please try again.");
  });

  it("uses the first value of a repeated parameter", () => {
    expect(signInErrorMessage(["access_denied", "NOT_INVITED"])).toBe("Sign-in was cancelled.");
  });
});
