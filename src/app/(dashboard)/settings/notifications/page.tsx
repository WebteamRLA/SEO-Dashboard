import type { Metadata } from "next";
import { Panel } from "@/components/data/panel";
import { NotificationPreferences } from "@/features/settings/notification-preferences";
import { getNotificationPreferences } from "@/lib/data/operations";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const preferences = await getNotificationPreferences();
  return (
    <Panel
      id="notifications"
      title="Notifications"
      description="Choose how you hear about each event. Your choices are saved for your account. New-lead emails go out when a website form sends a lead."
      flush
    >
      <NotificationPreferences initialPreferences={preferences} />
    </Panel>
  );
}
