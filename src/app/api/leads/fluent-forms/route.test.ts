import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { createDb } = vi.hoisted(() => ({ createDb: vi.fn() }));
vi.mock("@/server/db/client", () => ({
  createDb,
  releaseDb: async (db: { $disconnect: () => Promise<void> }) => db.$disconnect(),
}));

const SECRET = "test-secret-value";
const URL_BASE = "https://seo.rightleftagency.com/api/leads/fluent-forms";

function post(body: string, headers: Record<string, string> = {}, url = URL_BASE) {
  return POST(
    new Request(url, {
      method: "POST",
      body,
      headers: { "content-type": "application/json", "x-webhook-secret": SECRET, ...headers },
    }),
  );
}

// Made-up people only: this repository is public.
const SUBMISSION = JSON.stringify({ names: { first_name: "Ada", last_name: "Example" }, email: "ada@example.com" });

interface UpsertArgs {
  create: Record<string, unknown>;
  update: Record<string, unknown>;
}

describe("POST /api/leads/fluent-forms", () => {
  let upsert: ReturnType<typeof vi.fn>;
  const firstCall = () => upsert.mock.calls[0]?.[0] as UpsertArgs;
  let db: { lead: { upsert: typeof upsert }; $disconnect: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.stubEnv("FLUENT_FORMS_WEBHOOK_SECRET", SECRET);
    vi.spyOn(console, "error").mockImplementation(() => {});
    upsert = vi.fn<(args: UpsertArgs) => Promise<{ id: string }>>(async () => ({ id: "lead-1" }));
    db = { lead: { upsert }, $disconnect: vi.fn(async () => {}) };
    createDb.mockReset();
    createDb.mockReturnValue(db);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stores a new submission as a website-form lead in the New stage", async () => {
    const response = await post(SUBMISSION, {}, `${URL_BASE}?form=Contact%20Form`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", id: "lead-1" });
    const call = firstCall();
    expect(call.create).toMatchObject({ origin: "website-form", stage: "new", name: "Ada Example", formName: "Contact Form" });
    expect(call.create.formEntryKey).toMatch(/^fluentforms:content:[0-9a-f]{64}$/);
    // A resend never resets the team's work.
    expect(call.update).not.toHaveProperty("stage");
    expect(call.update).not.toHaveProperty("submittedAt");
    expect(db.$disconnect).toHaveBeenCalled();
  });

  it("accepts Fluent Forms' form-encoded format", async () => {
    const response = await post("names%5Bfirst_name%5D=Ada&email=ada%40example.com", {
      "content-type": "application/x-www-form-urlencoded",
    });
    expect(response.status).toBe(200);
    expect(firstCall().create).toMatchObject({ name: "Ada", email: "ada@example.com" });
  });

  it("rejects a missing or wrong secret without touching the database", async () => {
    expect((await post(SUBMISSION, { "x-webhook-secret": "" })).status).toBe(401);
    expect((await post(SUBMISSION, { "x-webhook-secret": "wrong" })).status).toBe(401);
    expect(createDb).not.toHaveBeenCalled();
  });

  it("refuses everything when no secret is configured", async () => {
    vi.stubEnv("FLUENT_FORMS_WEBHOOK_SECRET", "");
    expect((await post(SUBMISSION)).status).toBe(503);
    expect(createDb).not.toHaveBeenCalled();
  });

  it("rejects bodies that are not a submission", async () => {
    expect((await post("{not json", { "content-type": "application/json" })).status).toBe(400);
    expect((await post("[1,2]")).status).toBe(400);
    expect((await post(JSON.stringify({ message: "hi" }))).status).toBe(422);
    expect((await post("x".repeat(100_001))).status).toBe(413);
    expect(createDb).not.toHaveBeenCalled();
  });

  it("pairs the entry id with the answers, so another site's entry cannot overwrite this one", async () => {
    await post(JSON.stringify({ entry_id: "123", email: "ada@example.com" }));
    await post(JSON.stringify({ entry_id: "123", email: "bob@example.com" }));
    const [first, second] = upsert.mock.calls.map((args) => (args[0] as UpsertArgs).create.formEntryKey as string);
    expect(first).toMatch(/^fluentforms:123:[0-9a-f]{16}$/);
    expect(second).not.toBe(first);
  });

  it("treats a simultaneous duplicate as already stored", async () => {
    upsert.mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
    expect((await post(SUBMISSION)).status).toBe(200);
  });

  it("returns 500 without personal details when the database fails", async () => {
    upsert.mockRejectedValue(new Error("connection reset"));
    const response = await post(SUBMISSION);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("ada@example.com");
    expect(db.$disconnect).toHaveBeenCalled();
  });
});
