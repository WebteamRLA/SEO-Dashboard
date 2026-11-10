import { describe, expect, it } from "vitest";
import { classifyChannel, flattenFields, parseFormEncoded, toWebsiteFormLead } from "./fluent-forms";

// Made-up people only: this repository is public.
const context = { formName: null, siteHost: "rightleftagency.com" };

describe("flattenFields", () => {
  it("flattens Fluent Forms' nested name field and lower-cases keys", () => {
    expect(flattenFields({ names: { first_name: "Ada", last_name: "Example" }, Email: " ada@example.com " })).toEqual({
      "names.first_name": "Ada",
      "names.last_name": "Example",
      email: "ada@example.com",
    });
  });

  it("strips NUL characters, which Postgres rejects", () => {
    expect(flattenFields({ "mess\u0000age": "pasted\u0000 text" })).toEqual({ message: "pasted text" });
  });

  it("joins checkbox answers and drops empty values", () => {
    expect(flattenFields({ services: ["SEO", "PPC", ""], company: "", note: null })).toEqual({ services: "SEO, PPC" });
  });
});

describe("parseFormEncoded", () => {
  it("ignores keys that would reach Object.prototype", () => {
    const parsed = parseFormEncoded("__proto__%5Bpolluted%5D=yes&constructor%5Bprototype%5D%5Bx%5D=1&email=a%40example.com");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(parsed).toEqual({ email: "a@example.com" });
  });

  it("rebuilds bracketed keys and repeated checkbox values", () => {
    expect(parseFormEncoded("names%5Bfirst_name%5D=Ada&names%5Blast_name%5D=Example&services%5B%5D=SEO&services%5B%5D=PPC")).toEqual({
      names: { first_name: "Ada", last_name: "Example" },
      services: ["SEO", "PPC"],
    });
  });
});

describe("toWebsiteFormLead", () => {
  it("maps an All Data webhook with tracking fields", () => {
    const lead = toWebsiteFormLead(
      flattenFields({
        names: { first_name: "Ada", last_name: "Example" },
        email: "Ada@Example.com",
        phone: "+1 555 0100",
        company_name: "Example Co",
        message: "We need help with local SEO.",
        monthly_revenue: "$50k",
        _wp_http_referer: "/contact",
        "g-recaptcha-response": "token",
        rla_referrer: "https://www.google.com/",
        rla_landing_page: "https://rightleftagency.com/services/seo",
        rla_page_url: "https://rightleftagency.com/contact",
      }),
      { ...context, formName: "Contact Form" },
    );
    expect(lead).toMatchObject({
      entryId: null,
      formName: "Contact Form",
      name: "Ada Example",
      email: "ada@example.com",
      phone: "+1 555 0100",
      company: "Example Co",
      pageUrl: "https://rightleftagency.com/contact",
      landingPage: "https://rightleftagency.com/services/seo",
      channel: "Organic Search",
    });
    // Unrecognised answers are kept under the message; internal fields are not.
    expect(lead?.message).toBe("We need help with local SEO.\n\nMonthly revenue: $50k");
  });

  it("uses the entry id when the webhook sends one", () => {
    const lead = toWebsiteFormLead({ entry_id: "412", email: "ada@example.com", form_title: "Free SEO Audit" }, context);
    expect(lead).toMatchObject({ entryId: "412", formName: "Free SEO Audit" });
  });

  it("gives a resend with different page or tracking fields the same identity", () => {
    const base = { email: "ada@example.com", message: "Hello" };
    const live = toWebsiteFormLead({ ...base, rla_page_url: "https://rightleftagency.com/contact", _wpnonce: "a1" }, context);
    const resent = toWebsiteFormLead(base, context);
    expect(live?.identity).toBe(resent?.identity);
    expect(toWebsiteFormLead({ ...base, message: "Different" }, context)?.identity).not.toBe(live?.identity);
  });

  it("shows every answer it did not use, including unused alternatives", () => {
    const lead = toWebsiteFormLead(
      { message: "hi", project_details: "big project", phone: "1", mobile: "2", email: "ada@example.com" },
      context,
    );
    expect(lead?.message).toBe("hi\n\nProject details: big project\nMobile: 2");
  });

  it("rejects an entry with no way to contact the person", () => {
    expect(toWebsiteFormLead({ message: "hello" }, context)).toBeNull();
  });
});

describe("classifyChannel", () => {
  const classify = (input: Partial<Parameters<typeof classifyChannel>[0]>) =>
    classifyChannel({ utmSource: null, utmMedium: null, referrer: null, siteHost: "rightleftagency.com", ...input });

  it("reads paid traffic from the medium", () => {
    expect(classify({ utmSource: "google", utmMedium: "cpc" })).toBe("Paid Search");
    expect(classify({ utmSource: "linkedin", utmMedium: "paid" })).toBe("Social");
    expect(classify({ utmSource: "facebook", utmMedium: "paid_social" })).toBe("Social");
    expect(classify({ utmSource: "linkedin" })).toBe("Social");
  });

  it("recognises AI assistants by utm_source or referrer", () => {
    expect(classify({ utmSource: "chatgpt.com" })).toBe("AI Search");
    expect(classify({ referrer: "https://www.perplexity.ai/search" })).toBe("AI Search");
  });

  it("classifies search, social, and other referrers", () => {
    expect(classify({ referrer: "https://www.google.co.uk/" })).toBe("Organic Search");
    expect(classify({ referrer: "https://www.google.com.au/" })).toBe("Organic Search");
    expect(classify({ referrer: "android-app://com.google.android.googlequicksearchbox/" })).toBe("Organic Search");
    expect(classify({ referrer: "https://www.linkedin.com/feed/" })).toBe("Social");
    expect(classify({ referrer: "https://partner-blog.example/" })).toBe("Referral");
    expect(classify({ utmSource: "newsletter", utmMedium: "email" })).toBe("Email");
  });

  it("does not count Gmail, Docs, or other Google products as search", () => {
    expect(classify({ referrer: "https://mail.google.com/" })).toBe("Email");
    expect(classify({ referrer: "android-app://com.google.android.gm/" })).toBe("Email");
    expect(classify({ referrer: "https://docs.google.com/document/d/x" })).toBe("Referral");
    expect(classify({ referrer: "https://notgoogle.example/" })).toBe("Referral");
  });

  it("does not mistake YouTube or the site's own pages for something else", () => {
    expect(classify({ utmSource: "youtube" })).toBe("Social");
    expect(classify({ referrer: "https://rightleftagency.com/contact" })).toBe("Unknown");
    expect(classify({ referrer: "https://www.rightleftagency.com/blog" })).toBe("Unknown");
  });

  it("reports Direct only when the snippet said so, otherwise Unknown", () => {
    expect(classify({ utmSource: "(direct)", utmMedium: "(none)" })).toBe("Direct");
    expect(classify({})).toBe("Unknown");
  });
});
