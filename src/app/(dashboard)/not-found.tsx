import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/data/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="Page not found"
      description="This page does not exist, or the item it pointed to is no longer available."
      action={
        <Button asChild>
          <Link href="/overview">Go to Overview</Link>
        </Button>
      }
    />
  );
}
