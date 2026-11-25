import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { RunChecksButton } from "@/features/site-health/run-checks-button";
import { SiteHealthView } from "@/features/site-health/site-health-view";
import { getSiteHealth } from "@/lib/data/site-health";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Site health" };

/** "Run checks now" runs the checks after responding; a full site check takes a few minutes. */
export const maxDuration = 300;

export default async function SiteHealthPage() {
  const [data, user] = await Promise.all([getSiteHealth(), getSessionUser()]);
  const running = data.speed.running || data.indexing.running || data.crawl.running;

  return (
    <PageBody>
      <PageHeader
        title="Site health"
        description="Speed, indexing and technical issues · Live from Google PageSpeed Insights, Search Console and the weekly site check"
      />
      <SiteHealthView data={data} actions={user?.role === "admin" ? <RunChecksButton running={running} /> : null} />
    </PageBody>
  );
}
