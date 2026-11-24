import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading state, shaped like a typical page (tiles, then a panel) to limit layout shift. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading page">
      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2.5 rounded-xl border border-border px-5 py-4">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="flex flex-col rounded-xl border border-border">
        <div className="flex flex-col gap-1.5 border-b border-border px-5 py-3.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="m-5 h-64 rounded-lg" />
      </div>
    </div>
  );
}
