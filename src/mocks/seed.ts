/** Seeded generator. Mock data must be identical on every render and build. */
export function createRandom(seed: number) {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    int(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick<T>(items: readonly [T, ...T[]] | readonly T[]): T {
      return items[Math.floor(next() * items.length)] as T;
    },
    chance(probability: number): boolean {
      return next() < probability;
    },
  };
}

export const pad = (value: number): string => String(value).padStart(2, "0");
