import type { Metadata } from "next";
import { FormsTable } from "@/features/settings/forms-table";
import { getFormConnections } from "@/lib/data/operations";

export const metadata: Metadata = { title: "Forms Setup" };

export default async function FormsSetupPage() {
  const forms = await getFormConnections();
  return (
    <section aria-labelledby="forms-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="forms-heading" className="text-sm font-semibold">Forms setup</h2>
        <p className="text-sm text-muted-foreground">
          Website forms that will send submissions to the dashboard.
        </p>
      </div>
      <FormsTable forms={forms} />
    </section>
  );
}
