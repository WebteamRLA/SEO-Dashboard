import { describe, expect, it } from "vitest";
import { buildAccessList } from "./access-list";

const at = new Date("2026-11-01T00:00:00Z");

describe("buildAccessList", () => {
  it("shows invites as invited and signed-in users as active", () => {
    const list = buildAccessList(
      [{ name: "Ann", email: "Ann@Example.com", role: "manager" }],
      [
        { email: "ann@example.com", role: "manager", createdAt: at },
        { email: "bo@example.com", role: "member", createdAt: at },
      ],
      [],
    );
    expect(list).toEqual([
      { email: "ann@example.com", name: "Ann", role: "manager", status: "active", bootstrap: false, invitedAt: at.toISOString() },
      { email: "bo@example.com", name: null, role: "member", status: "invited", bootstrap: false, invitedAt: at.toISOString() },
    ]);
  });

  it("marks bootstrap admins, signed in or not", () => {
    const list = buildAccessList([{ name: "Web", email: "web@example.com", role: "admin" }], [], ["web@example.com", "boss@example.com"]);
    expect(list).toEqual([
      { email: "web@example.com", name: "Web", role: "admin", status: "active", bootstrap: true, invitedAt: null },
      { email: "boss@example.com", name: null, role: "admin", status: "invited", bootstrap: true, invitedAt: null },
    ]);
  });

  it("gives an unknown role the least privilege", () => {
    expect(buildAccessList([], [{ email: "x@example.com", role: "owner", createdAt: at }], [])[0]?.role).toBe("member");
  });
});
