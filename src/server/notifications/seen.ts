/** Cookie recording when this browser last opened the notifications menu. */
export const SEEN_COOKIE = "rla_notifications_seen";

/**
 * Reads the cookie value. It comes from the browser, so it is untrusted: junk,
 * or a time more than five minutes ahead, counts as "never seen".
 */
export function parseSeenAt(value: string | undefined, now: number = Date.now()): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time > now + 5 * 60_000) return null;
  return new Date(time).toISOString();
}
