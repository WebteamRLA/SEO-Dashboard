import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  after: () => {
    throw new Error("outside a request");
  },
}));

const { createSwrCache } = await import("./swr");

function setup() {
  let time = 0;
  const get = createSwrCache<number>({ freshMs: 100, staleMs: 1000, failureMs: 50, now: () => time });
  return { get, advance: (ms: number) => (time += ms) };
}

describe("createSwrCache", () => {
  it("loads once and serves fresh data from memory", async () => {
    const { get } = setup();
    const loader = vi.fn().mockResolvedValue(1);
    expect(await get("k", loader)).toBe(1);
    expect(await get("k", loader)).toBe(1);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("shares one load between concurrent callers", async () => {
    const { get } = setup();
    const loader = vi.fn().mockResolvedValue(1);
    await Promise.all([get("k", loader), get("k", loader), get("k", loader)]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("serves stale data at once and refreshes in the background", async () => {
    const { get, advance } = setup();
    await get("k", () => Promise.resolve(1));
    advance(200);
    let release!: (value: number) => void;
    const loader = vi.fn(() => new Promise<number>((resolve) => (release = resolve)));
    expect(await get("k", loader)).toBe(1);
    expect(loader).toHaveBeenCalledTimes(1);
    release(2);
    await Promise.resolve();
    await Promise.resolve();
    expect(await get("k", loader)).toBe(2);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("waits for a reload when the data is too old", async () => {
    const { get, advance } = setup();
    await get("k", () => Promise.resolve(1));
    advance(2000);
    expect(await get("k", () => Promise.resolve(3))).toBe(3);
  });

  it("keeps the last good value when a background refresh fails", async () => {
    const { get, advance } = setup();
    await get("k", () => Promise.resolve(1));
    advance(200);
    expect(await get("k", () => Promise.reject(new Error("down")))).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await get("k", () => Promise.resolve(5))).toBe(1);
  });

  it("remembers a failure briefly, then retries", async () => {
    const { get, advance } = setup();
    const failing = vi.fn().mockRejectedValue(new Error("down"));
    await expect(get("k", failing)).rejects.toThrow("down");
    await expect(get("k", failing)).rejects.toThrow("down");
    expect(failing).toHaveBeenCalledTimes(1);
    advance(60);
    await expect(get("k", () => Promise.resolve(7))).resolves.toBe(7);
  });

  it("refreshes on demand and reports when the value was loaded", async () => {
    const { get, advance } = setup();
    await get("k", () => Promise.resolve(1));
    expect(get.loadedAt("k")).toBe(0);
    advance(10);
    expect(await get.refresh("k", () => Promise.resolve(2))).toBe(2);
    expect(get.loadedAt("k")).toBe(10);
    expect(await get("k", () => Promise.resolve(3))).toBe(2);
    expect(get.loadedAt("missing")).toBeNull();
  });
});
