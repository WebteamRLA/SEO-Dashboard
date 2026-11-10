import type { Metadata } from "next";
import { NotificationPreferences } from "@/features/settings/notification-preferences";
import { getNotificationPreferences } from "@/lib/data/operations";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const preferences = await getNotificationPreferences();
  return (
    <section aria-labelledby="notifications-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="notifications-heading" className="text-sm font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Choose how you hear about each event. Your choices are saved for your account. New-lead emails go out when a website form sends a lead.
        </p>
      </div>
      <NotificationPreferences initialPreferences={preferences} />
    </section>
  );
}
