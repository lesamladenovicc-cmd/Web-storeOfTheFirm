import Link from "next/link";
import { COPY } from "@/config/copy";
import { FOOTER_NAV, SITE } from "@/config/site";
import { Container } from "./Container";
import { Logo } from "./Logo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-paper-muted">
              {COPY.footer.tagline}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-paper-faint">
              {COPY.footer.builtNote}
            </p>
          </div>

          {FOOTER_NAV.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="u-eyebrow mb-4 text-paper-faint">{group.title}</h2>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-paper-muted transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-7 text-sm text-paper-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {SITE.legalName}. {COPY.footer.rightsReserved}
          </p>
          <p className="u-numeric text-xs">
            {COPY.footer.pib} {SITE.registration.pib} · {COPY.footer.maticniBroj}{" "}
            {SITE.registration.maticniBroj}
          </p>
        </div>
      </Container>
    </footer>
  );
}
