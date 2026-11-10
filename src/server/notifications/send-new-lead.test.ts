import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { createDb, sendEmail } = vi.hoisted(() => ({ createDb: vi.fn(), sendEmail: vi.fn() }));
vi.mock("@/server/db/client", () => ({ createDb, releaseDb: vi.fn(async () => {}) }));
vi.mock("@/server/email/resend", () => ({
  getEmailConfig: () => (process.env.RESEND_API_KEY ? { apiKey: "k", from: "f" } : null),
  sendEmail,
}));

import { MAX_PER_HOUR, notifyNewLead } from "./send-new-lead";

const lead = { id: "lead-1", name: "Ada Lane", company: null, email: null, formName: "Contact Form", channel: "Organic Search" };

function fakeDb(
  users: { email: string; notificationPreferences: { eventId: string; email: boolean; inApp: boolean }[] }[],
  leadsLastHour = 1,
) {
  return {
    lead: { findUnique: vi.fn(async () => lead), count: vi.fn(async () => leadsLastHour) },
    user: { findMany: vi.fn(async () => users) },
  };
}

describe("notifyNewLead", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "test");
    vi.stubEnv("BETTER_AUTH_URL", "https://seo.example/");
    sendEmail.mockReset();
    sendEmail.mockResolvedValue({ ok: true, id: "x" });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("emails everyone who has not turned new-lead emails off, with a link to the lead", async () => {
    createDb.mockReturnValue(
      fakeDb([
        { email: "default@rla.example", notificationPreferences: [] },
        { email: "on@rla.example", notificationPreferences: [{ eventId: "new-lead", email: true, inApp: false }] },
        { email: "off@rla.example", notificationPreferences: [{ eventId: "new-lead", email: false, inApp: true }] },
      ]),
    );
    await notifyNewLead("lead-1");
    const sent = sendEmail.mock.calls.map(([message]) => message as { to: string; text: string });
    expect(sent.map((message) => message.to)).toEqual(["default@rla.example", "on@rla.example"]);
    expect(sent[0]?.text).toContain("https://seo.example/leads/lead-1");
  });

  it("stops emailing during a flood of website leads", async () => {
    createDb.mockReturnValue(fakeDb([{ email: "default@rla.example", notificationPreferences: [] }], MAX_PER_HOUR + 1));
    await notifyNewLead("lead-1");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing when email is not set up", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    createDb.mockReset();
    await notifyNewLead("lead-1");
    expect(createDb).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
