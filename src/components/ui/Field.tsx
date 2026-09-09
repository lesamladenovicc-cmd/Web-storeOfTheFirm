import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { COPY } from "@/config/copy";

/**
 * Form controls sit on a `panel` inside whatever ground they are in, so a
 * field on beige is a lighter paper plate and a field on dark is a
 * slightly lifted surface. Focus is a solid foreground border — a crisp
 * technical outline rather than a coloured glow.
 */
const CONTROL_BASE =
  "w-full border bg-panel px-4 font-sans text-[0.9375rem] text-fg transition-colors duration-150 placeholder:text-fg-faint focus:border-fg focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

const CONTROL_OK = "border-line hover:border-line-strong";
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
    <label htmlFor={htmlFor} className={cn("u-eyebrow text-fg-muted mb-2.5 block", className)}>
      {children}
      {optional ? (
        <span className="text-fg-faint ml-1.5 font-normal">({COPY.common.optional})</span>
      ) : null}
    </label>
  );
}

export function FieldError({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-danger mt-1.5 text-sm">
      {children}
    </p>
  );
}

export function FieldHint({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="text-fg-faint mt-1.5 text-sm">
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
export function Field({ label, name, error, hint, optional, children }: FieldWrapperProps) {
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
      className={cn(CONTROL_BASE, "h-12", hasError ? CONTROL_ERROR : CONTROL_OK, className)}
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
          "h-12 cursor-pointer appearance-none pr-11",
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
        className="text-fg-muted pointer-events-none absolute top-1/2 right-4 h-3 w-3 -translate-y-1/2"
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
        "text-fg-muted hover:text-fg flex cursor-pointer items-center gap-2.5 text-sm transition-colors",
        className,
      )}
    >
      <input
        type="checkbox"
        className="border-line-strong bg-panel checked:border-signal checked:bg-signal h-4 w-4 shrink-0 cursor-pointer appearance-none border transition-colors"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
