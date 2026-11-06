"use client";

import { toast } from "sonner";
import { PhaseBadge } from "@/components/data/phase-badge";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { Integration } from "@/lib/types";
import { INTEGRATION_STATUS_META } from "./settings-meta";

export function IntegrationsList({ integrations }: { integrations: Integration[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {integrations.map((integration) => {
        const meta = INTEGRATION_STATUS_META[integration.status];
        return (
          <li
            key={integration.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{integration.name}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{integration.description}</p>
              </div>
              <PhaseBadge phase={integration.phase} />
            </div>
            <StatusBadge tone={meta.tone} label={meta.label} className="self-start" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Account</dt>
                <dd className="truncate">{integration.account ?? "—"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Last sync</dt>
                <dd className="truncate">{formatDateTime(integration.lastSync)}</dd>
              </div>
            </dl>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                aria-label={`Connect ${integration.name}`}
                onClick={() =>
                  toast(`Connecting ${integration.name} arrives in the backend step. Nothing has been connected.`)
                }
              >
                Connect
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
