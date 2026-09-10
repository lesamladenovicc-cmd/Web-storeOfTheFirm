import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  CONDITION_LABELS,
  STATUS_LABELS,
  soldLabel,
  type ListingPurpose,
  type ListingCondition,
  type ListingStatus,
} from "@/config/taxonomy";

export type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning" | "paper";

/**
 * A mono tag with a hairline border. Every tone except `paper` reads the
 * ground, so the same badge is correct on dark and on beige.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: "border-line-strong text-fg-muted",
  accent: "border-accent text-accent-text",
  success: "border-success/50 text-success",
  danger: "border-danger/50 text-danger",
  warning: "border-warning/50 text-warning",
  paper: "border-ink/20 bg-beige-muted text-ink",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  /** Leading square in the tone colour — a status lamp. */
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "u-eyebrow inline-flex items-center gap-2 border px-2.5 py-1.5 text-[0.625rem]",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-current" /> : null}
      {children}
    </span>
  );
}

/**
 * Build phase never uses accent — accent belongs to actions, not metadata.
 * Only `useljivo` earns the success tone; the earlier phases are facts,
 * not warnings, so they stay neutral rather than borrowing `warning`.
 */
const CONDITION_TONES: Record<ListingCondition, BadgeTone> = {
  u_pripremi: "neutral",
  u_izgradnji: "neutral",
  pred_useljenje: "neutral",
  useljivo: "success",
};

export function ConditionBadge({
  condition,
  className,
}: {
  /** Null on an unfinished draft; nothing to show in that case. */
  condition: ListingCondition | null;
  className?: string;
}) {
  if (!condition) return null;

  return (
    <Badge tone={CONDITION_TONES[condition]} className={className}>
      {CONDITION_LABELS[condition]}
    </Badge>
  );
}

const STATUS_TONES: Record<ListingStatus, BadgeTone> = {
  nacrt: "neutral",
  aktivan: "success",
  prodato: "danger",
};

/**
 * `purpose` is optional so the badge still works where it is unknown,
 * but pass it wherever you have it: `prodato` is the terminal state for
 * rentals too, and without the purpose the badge falls back to the
 * ambiguous "Prodato / Izdato" instead of naming what happened.
 */
export function StatusBadge({
  status,
  purpose,
  className,
}: {
  status: ListingStatus;
  purpose?: ListingPurpose;
  className?: string;
}) {
  const label =
    status === "prodato" && purpose ? soldLabel(purpose) : STATUS_LABELS[status];

  return (
    <Badge tone={STATUS_TONES[status]} dot className={className}>
      {label}
    </Badge>
  );
}
