import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/cn";

/**
 * The small tracked mono label that sits above every large heading.
 *
 * The leading square is the signal yellow — the highlighter of the
 * sheet. Keeping it a non-text mark means it never has to clear a text
 * contrast ratio on either ground, and it makes every section opener
 * carry the same bright stamp.
 */
export function Eyebrow<T extends ElementType = "p">({
  as,
  className,
  children,
  mark = true,
  ...props
}: {
  as?: T;
  className?: string;
  /** Set false for inline uses where the square would be noise. */
  mark?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">) {
  const Tag = (as ?? "p") as ElementType;
  return (
    <Tag className={cn("u-eyebrow text-fg-muted flex items-center gap-2.5", className)} {...props}>
      {mark ? <span aria-hidden="true" className="bg-signal h-1.5 w-1.5 shrink-0" /> : null}
      <span>{children}</span>
    </Tag>
  );
}
