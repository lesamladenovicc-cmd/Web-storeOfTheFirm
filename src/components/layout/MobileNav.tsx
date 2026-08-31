"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { COPY } from "@/config/copy";
import { MAIN_NAV } from "@/config/site";
import { cn } from "@/lib/cn";

export function MobileNav({ isAuthed }: { isAuthed: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll and close on Escape while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? COPY.nav.closeMenu : COPY.nav.openMenu}
        className="grid h-10 w-10 place-items-center rounded-sm text-paper transition-colors hover:bg-surface-2 md:hidden"
      >
        <span className="relative block h-4 w-5">
          <span
            className={cn(
              "absolute left-0 block h-0.5 w-5 bg-current transition-transform duration-200",
              open ? "top-1.5 rotate-45" : "top-0",
            )}
          />
          <span
            className={cn(
              "absolute top-1.5 left-0 block h-0.5 w-5 bg-current transition-opacity duration-200",
              open && "opacity-0",
            )}
          />
          <span
            className={cn(
              "absolute left-0 block h-0.5 w-5 bg-current transition-transform duration-200",
              open ? "top-1.5 -rotate-45" : "top-3",
            )}
          />
        </span>
      </button>

      {open ? (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-16 bottom-0 z-40 border-t border-border bg-bg md:hidden"
        >
          <nav className="flex flex-col px-4 py-6" aria-label={COPY.nav.menu}>
            {MAIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "border-b border-border py-4 font-display text-h3 transition-colors",
                  pathname === item.href ? "text-accent" : "text-paper hover:text-accent",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={isAuthed ? "/dashboard" : "/prijava"}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-sm bg-accent font-medium text-bg"
            >
              {isAuthed ? COPY.nav.dashboard : COPY.nav.login}
            </Link>
          </nav>
        </div>
      ) : null}
    </>
  );
}
