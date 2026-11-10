import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "@/features/settings/settings-nav";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <PageBody>
      <PageHeader
        title="Settings"
        description="Connections, website forms, team access, notification preferences, and the delivery roadmap."
      />
      <SettingsNav />
      {children}
    </PageBody>
  );
}
