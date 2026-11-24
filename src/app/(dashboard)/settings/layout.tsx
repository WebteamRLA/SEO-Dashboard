import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageBody, PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Settings" };

/** The section tab bar (Team, Notifications, Delivery roadmap) comes from the app shell. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <PageBody>
      <PageHeader title="Settings" description="Team access, notification preferences, and the delivery roadmap." />
      {children}
    </PageBody>
  );
}
