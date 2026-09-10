import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { SITE, WORKING_HOURS } from "@/config/site";
import { ProsePage } from "@/components/layout/ProsePage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: COPY.pages.contact.title,
  description: COPY.pages.contact.lead,
  path: "/kontakt",
});

export default function ContactPage() {
  // Every row is conditional. Until the client supplies the details the
  // fields are null (see SITE.contact), and a row is dropped rather than
  // rendered empty — a "Telefon —" line reads as a broken page, and a
  // made-up number would be worse.
  const rows: { label: string; value: React.ReactNode; numeric?: boolean }[] = [];

  if (SITE.contact.phoneHref && SITE.contact.phone) {
    rows.push({
      label: COPY.contact.phone,
      numeric: true,
      value: (
        <a href={SITE.contact.phoneHref} className="hover:text-accent-text transition-colors">
          {SITE.contact.phone}
        </a>
      ),
    });
  }

  if (SITE.contact.email) {
    rows.push({
      label: COPY.contact.email,
      value: (
        <a
          href={`mailto:${SITE.contact.email}`}
          className="hover:text-accent-text transition-colors"
        >
          {SITE.contact.email}
        </a>
      ),
    });
  }

  rows.push({
    label: COPY.pages.contact.hoursLabel,
    value: (
      <>
        {WORKING_HOURS.map((w) => (
          <span key={w.label} className="block first:mt-0">
            {w.label}: <span className="u-numeric">{w.hours}</span>
          </span>
        ))}
      </>
    ),
  });

  rows.push({
    label: COPY.pages.contact.addressLabel,
    value: SITE.contact.address ? (
      <>
        {SITE.contact.address}
        <br />
        {[SITE.contact.postalCode, SITE.contact.city].filter(Boolean).join(" ")},{" "}
        {SITE.contact.country}
      </>
    ) : (
      `${SITE.contact.city}, ${SITE.contact.country}`
    ),
  });

  return (
    <ProsePage title={COPY.pages.contact.title} lead={COPY.pages.contact.lead}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="u-marks border-line bg-panel border p-6 sm:p-7">
          {/* The heading sits outside the <dl>: a <dl> may only contain
              dt/dd groups, and axe fails the page otherwise. */}
          <p className="u-eyebrow text-fg-faint mb-2">{COPY.pages.contact.infoTitle}</p>
          <dl>
            {rows.map((row) => (
              <div key={row.label} className="border-line border-t py-4 first:border-t-0">
                <dt className="u-eyebrow text-fg-muted">{row.label}</dt>
                <dd className={row.numeric ? "u-numeric text-fg mt-1.5" : "text-fg mt-1.5"}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          {/* Shown only while phone and e-mail are still null: without it
              the panel would be a single "Adresa" row with no explanation
              of how to actually reach anyone. */}
          {!SITE.contact.phone && !SITE.contact.email ? (
            <p className="border-line text-fg-muted mt-2 border-t pt-4 text-sm leading-relaxed">
              {COPY.pages.contact.pending}
            </p>
          ) : null}
        </div>

        <p className="text-fg-muted max-w-[60ch] text-[1.0625rem] leading-relaxed">
          {COPY.pages.contact.note}
        </p>
      </div>
    </ProsePage>
  );
}
