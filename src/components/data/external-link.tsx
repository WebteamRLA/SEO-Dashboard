import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Opens a page in another system (e.g. a Teamwork task) in a new tab, styled
 * as a link with an arrow so it reads as clickable. Renders plain children when
 * there is no URL, so sample data stays unlinked.
 */
export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string | undefined;
  children: ReactNode;
  className?: string;
}) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "text-primary underline-offset-2 hover:underline focus-visible:underline",
        className,
      )}
    >
      {children}
      <ArrowUpRight className="ml-0.5 inline size-3.5 align-[-2px] opacity-70" aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
