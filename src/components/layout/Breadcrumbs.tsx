import Link from "next/link";
import { cn } from "@/lib/cn";

export type Crumb = { name: string; path: string };

/**
 * Slash-separated mono trail. Reads its colours from the ground, so it
 * needs no tone prop: on the dark banner it is paper, on beige it is ink.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Navigacija" className={className}>
      <ol className="u-eyebrow text-fg-muted flex flex-wrap items-center gap-y-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.path} className="flex items-center">
              {i > 0 ? (
                <span aria-hidden="true" className="text-fg-faint mx-2.5">
                  /
                </span>
              ) : null}
              {isLast ? (
                <span aria-current="page" className={cn("text-fg", items.length > 1 && "truncate")}>
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="hover:text-fg transition-colors">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
