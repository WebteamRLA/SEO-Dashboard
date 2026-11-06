import Link from "next/link";
import { Button } from "@/components/ui/button";

/** For URLs outside any route. Pages inside the shell use `(dashboard)/not-found`. */
export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">This page does not exist.</p>
      <Button asChild className="mt-2">
        <Link href="/overview">Go to Overview</Link>
      </Button>
    </main>
  );
}
