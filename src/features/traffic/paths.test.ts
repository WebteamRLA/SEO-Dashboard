import { describe, expect, it } from "vitest";
import { shortenMiddle } from "./paths";

describe("shortenMiddle", () => {
  it("leaves short paths alone", () => {
    expect(shortenMiddle("/blog/micro-saas-startup-ideas/")).toBe("/blog/micro-saas-startup-ideas/");
  });

  it("cuts long paths to the limit, keeping both ends", () => {
    const path = "/blog/12-best-saas-marketing-agencies-for-the-sustainable-growth-of-your-startup/";
    const short = shortenMiddle(path);
    expect(short).toHaveLength(48);
    expect(short.startsWith("/blog/12-best-saas-")).toBe(true);
    expect(short.endsWith("-of-your-startup/")).toBe(true);
    expect(short).toContain("…");
  });
});
