import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Square, hairline-bordered, uppercase in the display face. Every variant
 * reads its colours from the surrounding ground, so the same button is
 * correct on a dark band and on beige paper.
 *
 * Accent is reserved for PRIMARY actions only. If a screen shows two
 * brick buttons, one of them is the wrong variant. `secondary` is the
 * inverse plate (ink on beige, paper on dark) and is the right choice
 * for the second-most-important action.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover disabled:hover:border-accent disabled:hover:bg-accent",
  secondary:
    "border-fg bg-fg text-ground hover:bg-transparent hover:text-fg disabled:hover:bg-fg disabled:hover:text-ground",
  outline:
    "border-line-strong bg-transparent text-fg hover:border-fg disabled:hover:border-line-strong",
  ghost: "border-transparent bg-transparent text-fg-muted hover:border-line-strong hover:text-fg",
  danger:
    "border-danger bg-danger text-ground hover:bg-transparent hover:text-danger disabled:hover:bg-danger disabled:hover:text-ground",
};

/** 40 / 48 / 56px. */
const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-5 text-[0.6875rem] gap-2",
  md: "h-12 px-7 text-xs gap-2.5",
  lg: "h-14 px-9 text-xs gap-3",
};

const BASE =
  "inline-flex items-center justify-center border font-[family-name:var(--font-ui)] font-semibold tracking-[0.12em] uppercase whitespace-nowrap transition-colors duration-200 select-none disabled:cursor-not-allowed disabled:opacity-50";

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

export type ButtonProps = BaseProps & ComponentPropsWithoutRef<"button">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </button>
  );
}

export type ButtonLinkProps = BaseProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </Link>
  );
}
