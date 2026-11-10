import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { createDb } = vi.hoisted(() => ({ createDb: vi.fn() }));
vi.mock("@/server/db/client", () => ({
  createDb,
  releaseDb: async (db: { $disconnect: () => Promise<void> }) => db.$disconnect(),
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    createDb.mockReset();
  });

  function database(query: () => Promise<unknown>) {
    const db = { $queryRaw: vi.fn(query), $disconnect: vi.fn(async () => {}) };
    createDb.mockReturnValue(db);
    return db;
  }

  it("reports ok when the database answers", async () => {
    const db = database(async () => [{ now: new Date() }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(db.$disconnect).toHaveBeenCalled();
  });

  it("returns 503 without details when the query fails, and still disconnects", async () => {
    const db = database(async () => {
      throw new Error("password authentication failed for user secret-user");
    });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret-user");
    expect(db.$disconnect).toHaveBeenCalled();
  });

  it("returns 503, not an unhandled error, when no database is configured", async () => {
    createDb.mockImplementation(() => {
      throw new Error("No database connection");
    });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("is never cached", async () => {
    database(async () => []);
    expect((await GET()).headers.get("cache-control")).toBe("no-store");
  });
});
