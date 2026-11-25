import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ requireSessionUser: vi.fn() }));
vi.mock("@/server/db/client", () => ({ createDb: vi.fn(), releaseDb: vi.fn() }));
vi.mock("@/server/site-health/jobs", () => ({ getPageSpeedKey: () => null, STALE_RUN_MS: 1 }));

const { countFixed } = await import("./site-health");

const group = (type: "missing-title" | "broken-link", pages: [string, string | null][]) => ({
  type,
  priority: "high" as const,
  title: type,
  description: "",
  detailLabel: null,
  pages: pages.map(([url, detail]) => ({ url, detail })),
});

describe("countFixed", () => {
  it("counts issue instances the latest check no longer finds", () => {
    const previous = [group("missing-title", [["/a", null], ["/b", null]]), group("broken-link", [["/c", "/gone"]])];
    const latest = [group("missing-title", [["/b", null], ["/d", null]])];
    expect(countFixed(previous, latest)).toBe(2);
  });

  it("does not count a page that is no longer slow as fixed: response time varies between runs", () => {
    const slow = { ...group("missing-title", [["/a", "4.1 s"]]), type: "slow-response" as const };
    expect(countFixed([slow], [])).toBe(0);
  });

  it("treats a different broken target on the same page as a different issue", () => {
    expect(countFixed([group("broken-link", [["/c", "/old"]])], [group("broken-link", [["/c", "/new"]])])).toBe(1);
  });
});
