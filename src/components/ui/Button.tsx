import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Accent is reserved for PRIMARY actions only. If a screen shows two
 * orange buttons, one of them is the wrong variant.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-bg hover:bg-accent-hover active:translate-y-px disabled:hover:bg-accent",
  secondary:
    "bg-beige text-ink hover:bg-beige-muted active:translate-y-px disabled:hover:bg-beige",
  outline:
    "border border-border-strong bg-transparent text-paper hover:border-accent hover:text-accent disabled:hover:border-border-strong disabled:hover:text-paper",
  ghost: "bg-transparent text-paper-muted hover:bg-surface-2 hover:text-paper",
  danger: "bg-danger text-paper hover:brightness-110 active:translate-y-px",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-[0.9375rem] gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
};

const BASE =
  "inline-flex items-center justify-center rounded-sm font-medium transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out-quart)] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 whitespace-nowrap";

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
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
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
