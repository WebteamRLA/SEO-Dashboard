import { describe, expect, it } from "vitest";
import { buildNewLeadEmail } from "./new-lead-email";

const base = { to: "team@rla.example", leadName: "Ada Lane", formName: "Contact Form", source: "Organic Search", leadUrl: "https://seo.example/leads/abc" };

describe("buildNewLeadEmail", () => {
  it("names the form in the subject, the person in the body, and links to the lead", () => {
    const email = buildNewLeadEmail(base);
    expect(email.subject).toBe("New website lead (Contact Form)");
    expect(email.text).toContain("Ada Lane sent an enquiry through Contact Form.");
    expect(email.text).toContain("https://seo.example/leads/abc");
    expect(email.html).toContain('href="https://seo.example/leads/abc"');
  });

  it("escapes form input in the HTML and keeps it out of the subject", () => {
    const email = buildNewLeadEmail({ ...base, leadName: '<img src=x onerror="alert(1)">\r\nUrgent: verify payroll', formName: null });
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;img");
    expect(email.subject).toBe("New website lead");
    expect(email.text).not.toMatch(/\r/);
  });

  it("copes with a lead that has no usable name", () => {
    expect(buildNewLeadEmail({ ...base, leadName: "  \n " }).text).toContain("Someone sent an enquiry");
  });
});
