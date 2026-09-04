import Link from "next/link";
import { SITE } from "@/config/site";
import { cn } from "@/lib/cn";

/**
 * Wordmark: a stencilled register-mark box plus the brand name set as a
 * tracked uppercase stamp. Deliberately typographic — no illustrative
 * logo to redraw when the niche or brand changes.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name} — početna`}
      className={cn("group inline-flex items-center gap-3", className)}
    >
      <span
        aria-hidden="true"
        className="border-accent text-accent-text group-hover:bg-accent group-hover:text-on-accent grid h-8 w-8 place-items-center border transition-colors duration-200"
      >
        <span className="u-numeric text-sm leading-none font-semibold">{SITE.name.charAt(0)}</span>
      </span>
      <span className="font-display text-fg text-[0.9375rem] font-bold tracking-[0.16em] uppercase">
        {SITE.name}
      </span>
    </Link>
  );
}
