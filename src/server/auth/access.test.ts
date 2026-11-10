import { describe, expect, it } from "vitest";
import { decideAccess, normalizeEmail, parseEmailList } from "./access";

const base = { email: "Ana@RLA.example", emailVerified: true, bootstrapAdmins: [] as string[], inviteRole: null };

describe("normalizeEmail / parseEmailList", () => {
  it("normalizes case and spaces", () => {
    expect(normalizeEmail("  Ana@RLA.example ")).toBe("ana@rla.example");
  });

  it("parses comma and space separated lists, dropping junk", () => {
    expect(parseEmailList("a@x.example, B@y.example  c@z.example,,notanemail")).toEqual([
      "a@x.example",
      "b@y.example",
      "c@z.example",
    ]);
    expect(parseEmailList(undefined)).toEqual([]);
  });
});

describe("decideAccess", () => {
  it("refuses an unverified email, even a bootstrap admin", () => {
    expect(decideAccess({ ...base, emailVerified: false, bootstrapAdmins: ["ana@rla.example"] })).toEqual({
      allowed: false,
      reason: "EMAIL_NOT_VERIFIED",
    });
  });

  it("makes a bootstrap admin an admin, case-insensitively", () => {
    expect(decideAccess({ ...base, bootstrapAdmins: ["ana@rla.example"] })).toEqual({ allowed: true, role: "admin" });
  });

  it("refuses an email with no invite", () => {
    expect(decideAccess(base)).toEqual({ allowed: false, reason: "NOT_INVITED" });
  });

  it("grants the invite's role", () => {
    expect(decideAccess({ ...base, inviteRole: "manager" })).toEqual({ allowed: true, role: "manager" });
  });

  it("falls back to member for an unknown stored role", () => {
    expect(decideAccess({ ...base, inviteRole: "superuser" })).toEqual({ allowed: true, role: "member" });
  });
});
