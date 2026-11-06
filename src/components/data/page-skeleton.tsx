import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading state. Sized like a typical page to limit layout shift. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Loading page">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
