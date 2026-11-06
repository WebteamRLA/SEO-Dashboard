import type { Metadata } from "next";
import { IntegrationsList } from "@/features/settings/integrations-list";
import { getIntegrations } from "@/lib/data/operations";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const integrations = await getIntegrations();
  return (
    <section aria-labelledby="integrations-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="integrations-heading" className="text-sm font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Sources the dashboard reads from. None of them are connected yet.
        </p>
      </div>
      <IntegrationsList integrations={integrations} />
    </section>
  );
}
