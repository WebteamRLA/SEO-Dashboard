import { describe, expect, it } from "vitest";
import { findActiveNav, NAVIGATION } from "./navigation";

describe("findActiveNav", () => {
  it("prefers the most specific route", () => {
    expect(findActiveNav("/leads/pipeline")?.item.label).toBe("Lead Pipeline");
    expect(findActiveNav("/ai-agents/content")?.item.label).toBe("Content Agent");
  });

  it("maps a detail route to its parent", () => {
    expect(findActiveNav("/leads/lead-001")?.item.label).toBe("Lead Inbox");
  });

  it("does not match a route that only shares a prefix", () => {
    expect(findActiveNav("/leadership")).toBeNull();
  });

  it("uses unique hrefs across the whole navigation", () => {
    const hrefs = NAVIGATION.flatMap((group) => group.items.map((item) => item.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
