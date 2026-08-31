import Link from "next/link";
import { SITE } from "@/config/site";
import { cn } from "@/lib/cn";

/**
 * Wordmark: a stencilled register-mark box plus the brand name.
 * Deliberately typographic — no illustrative logo to redraw when the
 * niche or brand changes.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name} — početna`}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span
        aria-hidden="true"
        className="relative grid h-8 w-8 place-items-center border border-accent text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-bg"
      >
        <span className="u-numeric text-sm font-semibold leading-none">
          {SITE.name.charAt(0)}
        </span>
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-paper">
        {SITE.name}
      </span>
    </Link>
  );
}
