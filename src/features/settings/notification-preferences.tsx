"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PhaseBadge } from "@/components/data/phase-badge";
import { DataTable, type Column } from "@/components/data/data-table";
import { Switch } from "@/components/ui/switch";
import type { NotificationPreference } from "@/lib/types";
import { saveNotificationPreference } from "@/server/notifications/actions";

type Channel = "email" | "inApp";

export function NotificationPreferences({
  initialPreferences,
}: {
  initialPreferences: NotificationPreference[];
}) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>(initialPreferences);

  function apply(id: string, channel: Channel, checked: boolean) {
    setPreferences((current) =>
      current.map((preference) => {
        // Unavailable preferences cannot change. Their switches are disabled too.
        if (preference.id !== id || !preference.available) return preference;
        return channel === "email"
          ? { ...preference, email: checked }
          : { ...preference, inApp: checked };
      }),
    );
  }

  /** Shows the change at once, saves it, and puts the switch back if saving fails. */
  function setChannel(id: string, channel: Channel, checked: boolean) {
    apply(id, channel, checked);
    saveNotificationPreference(id, channel, checked)
      .then((result) => {
        if (!result.ok) {
          apply(id, channel, !checked);
          toast.error(result.error);
        }
      })
      .catch(() => {
        apply(id, channel, !checked);
        toast.error("The setting could not be saved. Check your connection and try again.");
      });
  }

  const columns: Column<NotificationPreference>[] = [
    {
      id: "event",
      header: "Notification",
      cell: (preference) => (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{preference.label}</span>
            {preference.available ? null : <PhaseBadge phase={preference.phase} />}
          </div>
          <span className="text-sm text-muted-foreground">{preference.description}</span>
          {preference.available ? null : (
            <span className="text-xs text-muted-foreground">Not active yet</span>
          )}
        </div>
      ),
    },
    {
      id: "email",
      header: "Email",
      align: "right",
      cell: (preference) => (
        <Switch
          checked={preference.email}
          disabled={!preference.available}
          onCheckedChange={(checked) => setChannel(preference.id, "email", checked)}
          aria-label={`${preference.label}, email`}
        />
      ),
    },
    {
      id: "inApp",
      header: "In app",
      align: "right",
      cell: (preference) => (
        <Switch
          checked={preference.inApp}
          disabled={!preference.available}
          onCheckedChange={(checked) => setChannel(preference.id, "inApp", checked)}
          aria-label={`${preference.label}, in app`}
        />
      ),
    },
  ];

  return (
    <DataTable
      caption="Notification preferences by channel"
      columns={columns}
      rows={preferences}
      getRowId={(preference) => preference.id}
      pageSize={20}
    />
  );
}
