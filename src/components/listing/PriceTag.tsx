import { cn } from "@/lib/cn";
import { COPY } from "@/config/copy";
import { formatPrice } from "@/lib/format";
import type { ListingPurpose } from "@/config/taxonomy";

/**
 * Price is set in the mono face, semibold and tabular, in the foreground
 * of whatever ground it sits on. It is the loudest thing on a card by
 * weight and size, not by colour — the accent belongs to actions.
 */
export function PriceTag({
  price,
  purpose = "prodaja",
  isNegotiable = false,
  size = "md",
  tone = "fg",
  className,
}: {
  price: number | null;
  /** A rent is rendered `450 €/mesec`; a sale price carries no suffix. */
  purpose?: ListingPurpose;
  isNegotiable?: boolean;
  size?: "sm" | "md" | "lg";
  /** `accent` uses the ground-safe accent-text token, never the fill. */
  tone?: "fg" | "accent";
  className?: string;
}) {
  const sizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl sm:text-4xl",
  } as const;

  const tones = {
    fg: "text-fg",
    accent: "text-accent-text",
  } as const;

  return (
    <p
      className={cn(
        "u-numeric flex flex-wrap items-baseline gap-x-3 gap-y-1 font-semibold tracking-tight",
        sizes[size],
        tones[tone],
        className,
      )}
    >
      <span>{formatPrice(price, purpose)}</span>
      {isNegotiable && price !== null ? (
        <span className="u-eyebrow text-fg-faint basis-full font-normal">
          {COPY.listing.negotiable}
        </span>
      ) : null}
    </p>
  );
}
