import { cn } from "@/lib/cn";
import { COPY } from "@/config/copy";
import { formatPrice } from "@/lib/format";

/**
 * Price is set in monospace — the single most distinctive typographic
 * choice in the storefront. It reads as a stencilled equipment tag and
 * keeps digits aligned down a grid column.
 *
 * Accent-on-dark measures 5.63:1 so this passes AA. Never render this
 * component on a beige surface (2.49:1) — use `tone="ink"` there.
 */
export function PriceTag({
  price,
  isNegotiable = false,
  size = "md",
  tone = "accent",
  className,
}: {
  price: number | null;
  isNegotiable?: boolean;
  size?: "sm" | "md" | "lg";
  tone?: "accent" | "paper" | "ink";
  className?: string;
}) {
  const sizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl sm:text-4xl",
  } as const;

  const tones = {
    accent: "text-accent",
    paper: "text-paper",
    ink: "text-ink",
  } as const;

  return (
    <p className={cn("u-numeric font-semibold", sizes[size], tones[tone], className)}>
      {formatPrice(price)}
      {isNegotiable && price !== null ? (
        <span className="ml-2 align-middle text-xs font-normal text-paper-faint">
          {COPY.listing.negotiable.toLowerCase()}
        </span>
      ) : null}
    </p>
  );
}
