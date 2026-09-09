import Link from "next/link";
import { COPY } from "@/config/copy";
import { MAIN_NAV, SITE } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";

/**
 * `isAuthed` is passed in rather than read here so the header stays a
 * pure server component and the auth read happens once per layout.
 *
 * Always on the dark ground, whatever section scrolls beneath it. The
 * 2px signal strip along its top edge is the first bright detail on
 * every page — the coloured tape on the top of a sheet.
 */
export function SiteHeader({ isAuthed = false }: { isAuthed?: boolean }) {
  return (
    <header className="theme-dark border-line bg-ground/92 sticky top-0 z-50 border-b backdrop-blur-md">
      <span aria-hidden="true" className="bg-signal absolute inset-x-0 top-0 h-0.5" />
      <Container className="flex h-16 items-center justify-between gap-6 lg:h-20">
        <Logo />

        <nav aria-label={COPY.nav.menu} className="hidden items-center gap-8 md:flex">
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-fg-muted hover:text-fg after:bg-signal relative py-1 font-[family-name:var(--font-ui)] text-xs font-semibold tracking-[0.12em] uppercase transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:transition-all after:duration-300 hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          {SITE.contact.phoneHref ? (
            <a
              href={SITE.contact.phoneHref}
              className="u-numeric text-fg hover:text-signal-text hidden items-center gap-2.5 text-sm transition-colors xl:flex"
            >
              <PhoneIcon />
              {SITE.contact.phone}
            </a>
          ) : null}

          <ButtonLink
            href={isAuthed ? "/dashboard" : "/prijava"}
            variant="outline"
            size="sm"
            className="hidden md:inline-flex"
          >
            {isAuthed ? COPY.nav.dashboard : COPY.nav.login}
          </ButtonLink>

          <MobileNav isAuthed={isAuthed} />
        </div>
      </Container>
    </header>
  );
}

function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="text-fg-faint h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <path d="M5.2 2.2 6.6 5 5.3 6.4a8 8 0 0 0 4.3 4.3L11 9.4l2.8 1.4v2.4c0 .6-.5 1-1.1.9A11.6 11.6 0 0 1 2.3 3.3c-.1-.6.3-1.1.9-1.1h2Z" />
    </svg>
  );
}
