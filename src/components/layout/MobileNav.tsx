"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { COPY } from "@/config/copy";
import { MAIN_NAV, SITE } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/cn";

/**
 * Off-canvas panel sliding in from the right, pinned to the dark ground.
 *
 * ─────────────────────────────────────────────────────────────────────
 * THE OVERLAY IS PORTALLED TO <body>, AND MUST STAY THAT WAY.
 *
 * SiteHeader carries `backdrop-blur-md`. A backdrop-filter — like
 * filter, transform, perspective and contain — makes its element a
 * CONTAINING BLOCK for `position: fixed` descendants. Rendered in place,
 * the backdrop (`fixed inset-0`) and the drawer (`fixed inset-y-0`)
 * therefore resolved against the header's own 64px box instead of the
 * viewport: the menu opened, aria-expanded flipped, and the panel was a
 * 64px sliver at the top of the screen with every link unreachable.
 *
 * The portal takes both out of that subtree, so `fixed` means the
 * viewport again. Moving them back — or wrapping this component in any
 * new filter/transform ancestor — brings the bug straight back.
 * e2e/mobile-nav.spec.ts measures the drawer against the viewport to
 * catch exactly that.
 * ─────────────────────────────────────────────────────────────────────
 */
export function MobileNav({ isAuthed = false }: { isAuthed?: boolean }) {
  const pathname = usePathname();

  /**
   * The sheet stores the route it was opened on, and `open` is derived
   * from it. Navigating changes `pathname`, so the menu closes on its
   * own — including on browser back/forward — with no effect and no
   * cascading render. (An effect calling setState on pathname change is
   * the obvious version of this and is what the React compiler flags.)
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  // Body-scroll lock and Escape: a genuine external-system sync.
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenedOn(null);
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
        onClick={() => setOpenedOn(open ? null : pathname)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? COPY.nav.closeMenu : COPY.nav.openMenu}
        className="border-line text-fg hover:border-fg grid h-10 w-10 place-items-center border transition-colors md:hidden"
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

      {/* No mount guard is needed, and a `mounted` flag would only add a
          setState-in-effect the React compiler rejects: `openedOn` starts
          null, so `open` is false on the server render AND on hydration.
          By the time this is true a click has happened, which means a
          browser, which means `document.body`. */}
      {open
        ? createPortal(
            <>
              <button
                type="button"
                aria-label={COPY.nav.closeMenu}
                onClick={() => setOpenedOn(null)}
                className="bg-dark/80 fixed inset-0 z-40 md:hidden"
              />

              <div
                id="mobile-nav"
                className="theme-dark border-line fixed inset-y-0 right-0 z-50 flex w-full max-w-[340px] flex-col overflow-y-auto border-l px-7 py-8 md:hidden"
              >
                <Eyebrow>{SITE.name}</Eyebrow>
                <p className="text-fg-muted mt-3 text-sm leading-relaxed">{SITE.tagline}</p>

                <nav className="mt-9 flex flex-col" aria-label={COPY.nav.menu}>
                  {MAIN_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpenedOn(null)}
                      className={cn(
                        "border-line font-display border-b py-4 text-2xl font-semibold tracking-tight transition-colors",
                        pathname === item.href
                          ? "text-signal-text"
                          : "text-fg hover:text-signal-text",
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <ButtonLink
                  href={isAuthed ? "/dashboard" : "/prijava"}
                  onClick={() => setOpenedOn(null)}
                  size="lg"
                  className="mt-8 w-full"
                >
                  {isAuthed ? COPY.nav.dashboard : COPY.nav.login}
                </ButtonLink>

                <div className="mt-auto pt-10">
                  {SITE.contact.phoneHref ? (
                    <a
                      href={SITE.contact.phoneHref}
                      className="u-numeric text-fg hover:text-signal-text block text-sm transition-colors"
                    >
                      {SITE.contact.phone}
                    </a>
                  ) : null}
                  <p className="text-fg-muted mt-1.5 text-sm">
                    {[SITE.contact.address, SITE.contact.city].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
