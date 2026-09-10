import Link from "next/link";
import { COPY } from "@/config/copy";
import { FOOTER_NAV, SITE, WORKING_HOURS } from "@/config/site";
import { ColorBar } from "@/components/ui/ColorBar";
import { Container } from "./Container";
import { Logo } from "./Logo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="theme-dark border-line border-t">
      <Container className="py-14 lg:py-16">
        <div className="grid gap-10 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="text-fg-muted mt-5 text-sm leading-relaxed">{COPY.footer.tagline}</p>

            {/* Every row is conditional on SITE.contact, which holds
                `null` for anything the client has not confirmed — an
                empty "Telefon —" line reads as a broken page. */}
            {SITE.contact.phoneHref || SITE.contact.email ? (
              <ul className="mt-5 space-y-1.5 text-sm">
                {SITE.contact.phoneHref && SITE.contact.phone ? (
                  <li>
                    <a
                      href={SITE.contact.phoneHref}
                      className="u-numeric text-fg hover:text-accent-text transition-colors"
                    >
                      {SITE.contact.phone}
                    </a>
                  </li>
                ) : null}
                {SITE.contact.email ? (
                  <li>
                    <a
                      href={`mailto:${SITE.contact.email}`}
                      className="text-fg-muted hover:text-accent-text transition-colors"
                    >
                      {SITE.contact.email}
                    </a>
                  </li>
                ) : null}
                {WORKING_HOURS.map((w) => (
                  <li key={w.label} className="text-fg-faint">
                    {w.label}: <span className="u-numeric">{w.hours}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="text-fg-faint mt-5 text-sm leading-relaxed">{COPY.footer.builtNote}</p>
          </div>

          {FOOTER_NAV.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="u-eyebrow text-fg-faint mb-5">{group.title}</h2>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-fg-muted hover:text-fg text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="u-numeric border-line text-fg-faint mt-12 flex flex-col gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {SITE.legalName}. {COPY.footer.rightsReserved}
          </p>
          <p className="flex items-center gap-4">
            <ColorBar />
            <span>
              {[
                SITE.registration.pib && `${COPY.footer.pib} ${SITE.registration.pib}`,
                SITE.registration.maticniBroj &&
                  `${COPY.footer.maticniBroj} ${SITE.registration.maticniBroj}`,
                SITE.locale,
                SITE.currency,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
