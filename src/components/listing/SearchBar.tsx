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
    <form
      action="/oglasi"
      method="get"
      role="search"
      className={cn("flex flex-col gap-2 sm:flex-row sm:gap-0", className)}
    >
      <div className="relative flex-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="text-fg-faint pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
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
          className="border-line bg-panel text-fg placeholder:text-fg-faint hover:border-line-strong focus:border-fg h-14 w-full appearance-none border pr-4 pl-11 font-sans text-[0.9375rem] transition-colors focus:outline-none sm:border-r-0"
        />
      </div>
      <button
        type="submit"
        className="border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover inline-flex h-14 shrink-0 items-center justify-center border px-8 font-[family-name:var(--font-ui)] text-xs font-semibold tracking-[0.12em] uppercase transition-colors duration-200"
      >
        {COPY.listings.searchSubmit}
      </button>
    </form>
  );
}
