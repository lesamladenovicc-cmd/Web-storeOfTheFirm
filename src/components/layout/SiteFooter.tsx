import Link from "next/link";
import { COPY } from "@/config/copy";
import { FOOTER_NAV, SITE } from "@/config/site";
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
            <p className="text-fg-faint mt-3 text-sm leading-relaxed">{COPY.footer.builtNote}</p>
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
              {COPY.footer.pib} {SITE.registration.pib} · {COPY.footer.maticniBroj}{" "}
              {SITE.registration.maticniBroj} · {SITE.locale} · {SITE.currency}
            </span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
