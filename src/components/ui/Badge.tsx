import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  CONDITION_LABELS,
  STATUS_LABELS,
  type ListingCondition,
  type ListingStatus,
} from "@/config/taxonomy";

export type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning" | "paper";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-border-strong text-paper-muted",
  accent: "border-accent/50 text-accent",
  success: "border-success/50 text-success",
  danger: "border-danger/50 text-danger",
  warning: "border-warning/50 text-warning",
  paper: "border-ink/20 bg-beige-muted text-ink",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "u-eyebrow inline-flex items-center rounded-xs border px-2 py-1",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Condition never uses accent — accent belongs to actions, not metadata. */
const CONDITION_TONES: Record<ListingCondition, BadgeTone> = {
  novo: "success",
  kao_novo: "neutral",
  korisceno: "neutral",
  neispravno: "warning",
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

export function StatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  return (
    <Badge tone={STATUS_TONES[status]} className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
