import { describe, expect, it, vi } from "vitest";
import { DEFAULT_FROM, getEmailConfig, sendEmail } from "./resend";

const message = { to: "a@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };
const config = { apiKey: "re_test", from: "X <x@example.com>" };

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("getEmailConfig", () => {
  it("is null without an API key", () => {
    expect(getEmailConfig({})).toBeNull();
    expect(getEmailConfig({ RESEND_API_KEY: "  " })).toBeNull();
  });

  it("uses the default sender unless RESEND_FROM is set", () => {
    expect(getEmailConfig({ RESEND_API_KEY: "k" })).toEqual({ apiKey: "k", from: DEFAULT_FROM });
    expect(getEmailConfig({ RESEND_API_KEY: "k", RESEND_FROM: "Y <y@z.com>" })?.from).toBe("Y <y@z.com>");
  });
});

describe("sendEmail", () => {
  it("posts the message to Resend with the key", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { id: "email_1" }));
    await expect(sendEmail(message, { config, fetchImpl })).resolves.toEqual({ ok: true, id: "email_1" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer re_test");
    expect(JSON.parse(String(init.body))).toMatchObject({ from: config.from, to: ["a@example.com"], subject: "Hi" });
  });

  it("reports Resend's error message", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(403, { message: "Domain not verified" }));
    await expect(sendEmail(message, { config, fetchImpl })).resolves.toEqual({
      ok: false,
      error: "Resend refused the email (Domain not verified)",
    });
  });

  it("reports a network failure without throwing", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(sendEmail(message, { config, fetchImpl })).resolves.toEqual({ ok: false, error: "could not reach Resend" });
  });

  it("does not call Resend when unconfigured", async () => {
    const fetchImpl = vi.fn();
    const result = await sendEmail(message, { config: null, fetchImpl });
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
