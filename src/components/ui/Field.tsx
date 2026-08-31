import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { COPY } from "@/config/copy";

const CONTROL_BASE =
  "w-full rounded-sm border bg-surface px-3.5 text-paper transition-colors duration-150 placeholder:text-paper-faint focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

const CONTROL_OK = "border-border hover:border-border-strong";
const CONTROL_ERROR = "border-danger";

/* ------------------------------------------------------------------ */

export function Label({
  children,
  htmlFor,
  optional = false,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  optional?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-1.5 block text-sm font-medium text-paper", className)}
    >
      {children}
      {optional ? (
        <span className="ml-1.5 font-normal text-paper-faint">
          ({COPY.common.optional})
        </span>
      ) : null}
    </label>
  );
}

export function FieldError({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-danger">
      {children}
    </p>
  );
}

export function FieldHint({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-paper-faint">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */

type FieldWrapperProps = {
  label?: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: (ariaProps: {
    id: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
  }) => ReactNode;
};

/** Wires label / hint / error to the control with correct ARIA. */
export function Field({
  label,
  name,
  error,
  hint,
  optional,
  children,
}: FieldWrapperProps) {
  const id = `f-${name}`;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      {label ? (
        <Label htmlFor={id} optional={optional}>
          {label}
        </Label>
      ) : null}
      {children({
        id,
        ...(error ? { "aria-invalid": true as const } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}
      <FieldError id={errorId}>{error}</FieldError>
      {!error ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Input({
  className,
  hasError,
  ...props
}: ComponentPropsWithoutRef<"input"> & { hasError?: boolean }) {
  return (
    <input
      className={cn(CONTROL_BASE, "h-11", hasError ? CONTROL_ERROR : CONTROL_OK, className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  hasError,
  rows = 6,
  ...props
}: ComponentPropsWithoutRef<"textarea"> & { hasError?: boolean }) {
  return (
    <textarea
      rows={rows}
      className={cn(
        CONTROL_BASE,
        "resize-y py-3 leading-relaxed",
        hasError ? CONTROL_ERROR : CONTROL_OK,
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  hasError,
  children,
  ...props
}: ComponentPropsWithoutRef<"select"> & { hasError?: boolean }) {
  return (
    <div className="relative">
      <select
        className={cn(
          CONTROL_BASE,
          "h-11 cursor-pointer appearance-none pr-10",
          hasError ? CONTROL_ERROR : CONTROL_OK,
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute top-1/2 right-3.5 h-3 w-3 -translate-y-1/2 text-paper-muted"
      >
        <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: ComponentPropsWithoutRef<"input"> & { label: ReactNode }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 text-sm text-paper-muted transition-colors hover:text-paper",
        className,
      )}
    >
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-xs border border-border-strong bg-surface transition-colors checked:border-accent checked:bg-accent"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
