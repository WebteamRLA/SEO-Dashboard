import type { Metadata } from "next";
import { PreviewNotice } from "@/components/data/preview-notice";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { BrokenLinksView } from "@/features/site-health/broken-links-view";
import { getBrokenLinks } from "@/lib/data/operations";

export const metadata: Metadata = { title: "Broken Links" };

export default async function BrokenLinksPage() {
  const links = await getBrokenLinks();

  return (
    <PageBody>
      <PageHeader
        phase="P2"
        title="Broken Links"
        description="Links on the website that return an error, with the page they were found on and their issue status."
      />
      <PreviewNotice phase="P2">
        The links listed are sample entries. No crawl has been run, so this is not a current scan of the site.
      </PreviewNotice>

      <BrokenLinksView links={links} />
    </PageBody>
  );
}
