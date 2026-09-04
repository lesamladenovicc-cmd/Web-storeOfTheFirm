import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function Container({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "main" | "nav";
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-[var(--container-page)] px-4 sm:px-6", className)}>
      {children}
    </Tag>
  );
}

/** Page title block with an optional mono eyebrow and trailing slot. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow className="mb-4">{eyebrow}</Eyebrow> : null}
        <h1 className="text-h1 text-fg">{title}</h1>
        {subtitle ? <p className="text-fg-muted mt-3">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
    </div>
  );
}
