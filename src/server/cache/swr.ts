import "server-only";
import { after } from "next/server";

interface Entry<T> {
  /** The last good value, and when it was loaded. */
  value?: T;
  loadedAt?: number;
  /** The last failure, kept briefly so a broken source is not retried on every page load. */
  error?: unknown;
  failedAt?: number;
  /** A load in flight, shared by everyone asking for the same key. */
  pending?: Promise<T>;
}

export interface SwrOptions {
  /** Served as is, without touching the source. */
  freshMs: number;
  /** After `freshMs` and up to this age: served at once while a refresh runs in the background. */
  staleMs: number;
  /** A failure is answered from memory for this long before the source is tried again. */
  failureMs: number;
  /** Oldest keys are dropped beyond this many. */
  maxEntries?: number;
  /** For tests. */
  now?: () => number;
}

/** Keeps a background refresh alive after the response is sent, where the platform supports it. */
function runInBackground(task: Promise<unknown>) {
  const settled = task.catch(() => undefined);
  try {
    after(() => settled);
  } catch {
    // Outside a request (tests, scripts): the promise simply runs on.
  }
}

/**
 * A per-instance stale-while-revalidate cache for slow external sources
 * (Teamwork, Google). Pages get the last good data at once; when it has aged
 * past `freshMs`, one background request refreshes it for the next visitor.
 * Only data older than `staleMs`, or no data at all, makes a page wait.
 */
export function createSwrCache<T>({ freshMs, staleMs, failureMs, maxEntries = 100, now = Date.now }: SwrOptions) {
  const entries = new Map<string, Entry<T>>();

  function load(entry: Entry<T>, loader: () => Promise<T>): Promise<T> {
    entry.pending ??= loader()
      .then((value) => {
        entry.value = value;
        entry.loadedAt = now();
        entry.error = undefined;
        entry.failedAt = undefined;
        return value;
      })
      .catch((error: unknown) => {
        entry.error = error;
        entry.failedAt = now();
        throw error;
      })
      .finally(() => {
        entry.pending = undefined;
      });
    return entry.pending;
  }

  return function get(key: string, loader: () => Promise<T>): Promise<T> {
    let entry = entries.get(key);
    if (!entry) {
      entry = {};
      entries.set(key, entry);
      if (entries.size > maxEntries) entries.delete(entries.keys().next().value as string);
    }
    const time = now();
    const recentlyFailed = entry.failedAt !== undefined && time - entry.failedAt < failureMs;

    if (entry.loadedAt !== undefined && entry.value !== undefined) {
      const age = time - entry.loadedAt;
      if (age < freshMs) return Promise.resolve(entry.value);
      if (age < staleMs) {
        if (!entry.pending && !recentlyFailed) runInBackground(load(entry, loader));
        return Promise.resolve(entry.value);
      }
    }
    if (entry.pending) return entry.pending;
    if (recentlyFailed) return Promise.reject(entry.error);
    return load(entry, loader);
  };
}
