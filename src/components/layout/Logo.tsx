import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/config/site";
import { cn } from "@/lib/cn";
import emblem from "@/assets/brand/logo-badge.png";

/**
 * The BG Building emblem beside the brand name set as a tracked uppercase
 * stamp.
 *
 * The emblem is cut to its own circle (see scripts/make-logo.mjs), so it
 * sits as a white seal on the navy header and on paper alike with no box
 * around it. The name still comes from SITE: swapping the brand text is a
 * config edit, and the image is the one thing that gets replaced by hand.
 *
 * Eager, not `priority`: the header and the footer both render this, and
 * a 44px image is not worth a preload hint.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name} — početna`}
      className={cn("group inline-flex items-center gap-3", className)}
    >
      <Image
        src={emblem}
        alt=""
        width={44}
        height={44}
        loading="eager"
        className="h-10 w-10 shrink-0 select-none lg:h-11 lg:w-11"
      />
      <span className="font-display text-fg group-hover:text-accent-text text-[0.9375rem] font-bold tracking-[0.16em] uppercase transition-colors duration-200">
        {SITE.name}
      </span>
    </Link>
  );
}
