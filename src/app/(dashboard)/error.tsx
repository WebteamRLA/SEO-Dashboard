"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/empty-state";
import { TriangleAlert } from "lucide-react";

export default function DashboardError({ retry }: { retry: () => void }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="This page could not be loaded"
      description="Something went wrong while loading this page. Try again, and let the team know if it keeps happening."
      action={<Button onClick={() => retry()}>Try again</Button>}
    />
  );
}
