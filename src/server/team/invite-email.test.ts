import { describe, expect, it } from "vitest";
import { buildInviteEmail } from "./invite-email";

describe("buildInviteEmail", () => {
  const email = buildInviteEmail({
    to: "new@example.com",
    role: "manager",
    inviterName: "Sam <script>",
    signInUrl: "https://seo.example.com/login",
  });

  it("names the inviter, role, address, and sign-in link", () => {
    expect(email.to).toBe("new@example.com");
    expect(email.subject).toBe("Sam <script> invited you to the RLA SEO Dashboard");
    expect(email.text).toContain("Manager access");
    expect(email.text).toContain("new@example.com");
    expect(email.text).toContain("https://seo.example.com/login");
    expect(email.html).toContain('href="https://seo.example.com/login"');
  });

  it("escapes names in the HTML", () => {
    expect(email.html).toContain("Sam &lt;script&gt;");
    expect(email.html).not.toContain("<script>");
  });

  it("falls back when the inviter has no name", () => {
    expect(buildInviteEmail({ to: "a@b.co", role: "member", inviterName: " ", signInUrl: "u" }).subject).toMatch(/^A teammate/);
  });
});
