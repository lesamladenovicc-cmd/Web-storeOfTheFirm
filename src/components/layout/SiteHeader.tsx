import Link from "next/link";
import { COPY } from "@/config/copy";
import { MAIN_NAV } from "@/config/site";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";

/**
 * `isAuthed` is passed in rather than read here so the header stays a
 * pure server component and the auth read happens once per layout.
 */
export function SiteHeader({ isAuthed = false }: { isAuthed?: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/92 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav
          aria-label={COPY.nav.menu}
          className="hidden items-center gap-8 md:flex"
        >
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative py-1 text-[0.9375rem] text-paper-muted transition-colors hover:text-paper after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-accent after:transition-all after:duration-200 hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={isAuthed ? "/dashboard" : "/prijava"}
            className="hidden h-9 items-center rounded-sm border border-border-strong px-4 text-sm text-paper transition-colors hover:border-accent hover:text-accent md:inline-flex"
          >
            {isAuthed ? COPY.nav.dashboard : COPY.nav.login}
          </Link>
          <MobileNav isAuthed={isAuthed} />
        </div>
      </Container>
    </header>
  );
}
