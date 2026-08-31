import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ButtonLink } from "./Button";

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  title,
  body,
  action,
  icon,
  className,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-dashed border-border px-6 py-20 text-center",
        className,
      )}
    >
      <div className="mb-5 text-paper-faint" aria-hidden="true">
        {icon ?? <CrateIcon />}
      </div>
      <h2 className="text-h3 text-paper">{title}</h2>
      {body ? <p className="mt-2 max-w-md text-paper-muted">{body}</p> : null}
      {action ? (
        <ButtonLink href={action.href} variant="secondary" size="md" className="mt-7">
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}

/** Neutral, niche-agnostic mark — a crate, not a machine. */
function CrateIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" stroke="currentColor">
      <path d="M6 16 24 7l18 9v16l-18 9-18-9V16Z" strokeWidth="1.5" />
      <path d="M6 16l18 9 18-9M24 25v16" strokeWidth="1.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-sm bg-surface-2", className)}
    />
  );
}

/** Geometry mirrors ListingCard so the swap does not shift layout. */
export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <Skeleton className="aspect-4/3 rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spinner                                                             */
/* ------------------------------------------------------------------ */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4 animate-spin", className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" fill="none" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Inline alert                                                        */
/* ------------------------------------------------------------------ */

export function Alert({
  tone = "danger",
  title,
  children,
}: {
  tone?: "danger" | "success" | "info";
  title?: string;
  children?: ReactNode;
}) {
  const tones = {
    danger: "border-danger/40 bg-danger-soft text-danger",
    success: "border-success/40 bg-success-soft text-success",
    info: "border-border-strong bg-surface-2 text-paper-muted",
  } as const;

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-sm border px-4 py-3 text-sm", tones[tone])}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cn(title && "mt-1")}>{children}</div> : null}
    </div>
  );
}
