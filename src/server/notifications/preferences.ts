import { z } from "zod";
import type { NotificationPreference } from "@/lib/types";

/**
 * Notification settings per person. The event list and its defaults live in
 * code; a person's saved choices override the defaults for events that are
 * actually delivered. Pure, so the rules are tested without a database.
 */

export const NEW_LEAD_EVENT = "new-lead";

export interface SavedPreference {
  eventId: string;
  email: boolean;
  inApp: boolean;
}

/** The catalog with this person's saved choices applied. Events not delivered yet keep their defaults. */
export function mergePreferences(
  catalog: readonly NotificationPreference[],
  saved: readonly SavedPreference[],
): NotificationPreference[] {
  const byEvent = new Map(saved.map((row) => [row.eventId, row]));
  return catalog.map((preference) => {
    const row = preference.available ? byEvent.get(preference.id) : undefined;
    return row ? { ...preference, email: row.email, inApp: row.inApp } : { ...preference };
  });
}

/** Whether one person wants an event on a channel: their saved choice, else the default. */
export function wants(
  catalog: readonly NotificationPreference[],
  saved: readonly SavedPreference[],
  eventId: string,
  channel: "email" | "inApp",
): boolean {
  return mergePreferences(catalog, saved).find((preference) => preference.id === eventId)?.[channel] ?? false;
}

export const preferenceChangeSchema = z.object({
  eventId: z.string().min(1).max(64),
  channel: z.enum(["email", "inApp"]),
  enabled: z.boolean(),
});
