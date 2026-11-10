import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAccessHooks, type AccessDb } from "./hooks";

function fakeDb(invites: Record<string, string>, users: Record<string, { email: string; emailVerified: boolean; role: string }> = {}) {
  const update = vi.fn(async () => ({}));
  const db: AccessDb = {
    accessInvite: { findUnique: async ({ where }) => (where.email in invites ? { role: invites[where.email]! } : null) },
    user: {
      findUnique: async ({ where }) => (users[where.id] ? { id: where.id, ...users[where.id]! } : null),
      update,
    },
  };
  return { db, update };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as { body?: { code?: string } }).body?.code;
  }
}

describe("user.create.before", () => {
  it("blocks an uninvited Google account with NOT_INVITED", async () => {
    const hooks = createAccessHooks(fakeDb({}).db, []);
    expect(await codeOf(hooks.user.create.before({ email: "stranger@x.example", emailVerified: true }))).toBe("NOT_INVITED");
    expect(console.warn).toHaveBeenCalledWith("Sign-in refused (NOT_INVITED) for stranger@x.example");
  });

  it("blocks an unverified email even if invited", async () => {
    const hooks = createAccessHooks(fakeDb({ "ana@x.example": "manager" }).db, []);
    expect(await codeOf(hooks.user.create.before({ email: "ana@x.example", emailVerified: false }))).toBe(
      "EMAIL_NOT_VERIFIED",
    );
  });

  it("sets the invited role, matching the invite case-insensitively", async () => {
    const hooks = createAccessHooks(fakeDb({ "ana@x.example": "manager" }).db, []);
    const result = await hooks.user.create.before({ email: "Ana@X.example", emailVerified: true, name: "Ana" });
    expect(result.data).toEqual({ email: "Ana@X.example", emailVerified: true, name: "Ana", role: "manager" });
  });

  it("makes a bootstrap admin an admin without an invite", async () => {
    const hooks = createAccessHooks(fakeDb({}).db, ["boss@x.example"]);
    const result = await hooks.user.create.before({ email: "boss@x.example", emailVerified: true });
    expect(result.data.role).toBe("admin");
  });
});

describe("session.create.before", () => {
  it("locks out a returning user whose invite was removed", async () => {
    const { db } = fakeDb({}, { u1: { email: "ana@x.example", emailVerified: true, role: "member" } });
    expect(await codeOf(createAccessHooks(db, []).session.create.before({ userId: "u1" }))).toBe("NOT_INVITED");
  });

  it("refuses a session for a user that no longer exists", async () => {
    expect(await codeOf(createAccessHooks(fakeDb({}).db, []).session.create.before({ userId: "ghost" }))).toBe(
      "NOT_INVITED",
    );
  });

  it("applies a role change from the invite", async () => {
    const { db, update } = fakeDb({ "ana@x.example": "admin" }, { u1: { email: "ana@x.example", emailVerified: true, role: "member" } });
    await createAccessHooks(db, []).session.create.before({ userId: "u1" });
    expect(update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { role: "admin" } });
  });

  it("does not write when the role is unchanged", async () => {
    const { db, update } = fakeDb({ "ana@x.example": "member" }, { u1: { email: "ana@x.example", emailVerified: true, role: "member" } });
    await createAccessHooks(db, []).session.create.before({ userId: "u1" });
    expect(update).not.toHaveBeenCalled();
  });
});
