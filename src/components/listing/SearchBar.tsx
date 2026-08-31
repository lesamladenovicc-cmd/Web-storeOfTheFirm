import { COPY } from "@/config/copy";
import { cn } from "@/lib/cn";

/**
 * Uncontrolled GET form — no client JS required. Submitting navigates to
 * /oglasi?q=…, which keeps search state in the URL (shareable, correct
 * back-button behaviour, server-rendered results).
 */
export function SearchBar({
  defaultValue = "",
  className,
  placeholder = COPY.listings.searchPlaceholder,
}: {
  defaultValue?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <form action="/oglasi" method="get" role="search" className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="pointer-events-none absolute top-1/2 left-4 h-4.5 w-4.5 -translate-y-1/2 text-paper-faint"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m13.5 13.5 3 3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={COPY.home.heroSearchLabel}
          className="h-12 w-full rounded-sm border border-border bg-surface pr-4 pl-11 text-paper transition-colors placeholder:text-paper-faint hover:border-border-strong focus:border-accent focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-12 shrink-0 items-center rounded-sm bg-accent px-6 font-medium text-bg transition-colors hover:bg-accent-hover"
      >
        {COPY.listings.searchSubmit}
      </button>
    </form>
  );
}
