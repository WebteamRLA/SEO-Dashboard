import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ createDb: vi.fn(), releaseDb: vi.fn() }));
vi.mock("@/server/google/client", () => ({ accessToken: vi.fn() }));
vi.mock("@/server/google/config", () => ({ getSearchConsoleSite: vi.fn() }));

const { homePage } = await import("./jobs");

describe("homePage", () => {
  it("keeps a URL-prefix property and turns a domain property into its home page", () => {
    expect(homePage("https://rightleftagency.com/")).toBe("https://rightleftagency.com/");
    expect(homePage("sc-domain:rightleftagency.com")).toBe("https://rightleftagency.com/");
  });
});
