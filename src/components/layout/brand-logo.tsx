import { cn } from "@/lib/utils";

/**
 * The app's logo mark (public/logo.png). A plain <img>: the file is tiny and the
 * Cloudflare build has no Next image optimizer configured. Decorative, since the
 * app name is always rendered beside it.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="" aria-hidden width={100} height={100} className={cn("shrink-0", className)} />
  );
}
