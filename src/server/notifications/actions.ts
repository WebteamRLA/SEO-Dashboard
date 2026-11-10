"use server";

import { cookies } from "next/headers";
import { requireSessionUser } from "@/server/auth/session";
import { notificationPreferences as CATALOG } from "@/mocks/operations";
import { createDb, releaseDb } from "@/server/db/client";
import { mergePreferences, preferenceChangeSchema } from "./preferences";
import { SEEN_COOKIE } from "./seen";
import { describeError } from "@/server/log";

/**
 * Records that this browser has seen the notifications up to now, which clears
 * the red dot. Per browser rather than per account, so it needs no database
 * table; the feed itself is the same for everyone.
 */
export async function markNotificationsSeen(): Promise<void> {
  await requireSessionUser();
  (await cookies()).set(SEEN_COOKIE, new Date().toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Turns one channel of one notification on or off for the signed-in person. */
export async function saveNotificationPreference(
  eventId: string,
  channel: "email" | "inApp",
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireSessionUser();
  const parsed = preferenceChangeSchema.safeParse({ eventId, channel, enabled });
  const event = parsed.success ? CATALOG.find((item) => item.id === parsed.data.eventId) : undefined;
  if (!parsed.success || !event?.available) return { ok: false, error: "That notification cannot be changed yet." };

  const db = createDb();
  try {
    const saved = await db.notificationPreference.findMany({
      where: { userId: user.id, eventId: event.id },
      select: { eventId: true, email: true, inApp: true },
    });
    const current = mergePreferences([event], saved)[0] ?? event;
    const next = { email: current.email, inApp: current.inApp, [parsed.data.channel]: parsed.data.enabled };
    await db.notificationPreference.upsert({
      where: { userId_eventId: { userId: user.id, eventId: event.id } },
      create: { userId: user.id, eventId: event.id, ...next },
      update: next,
    });
    return { ok: true };
  } catch (error) {
    console.error("Saving a notification preference failed:", describeError(error));
    return { ok: false, error: "The setting could not be saved. Try again." };
  } finally {
    await releaseDb(db);
  }
}
