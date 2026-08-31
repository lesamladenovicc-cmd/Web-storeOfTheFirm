import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { SITE } from "@/config/site";
import { ProsePage } from "@/components/layout/ProsePage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: COPY.pages.contact.title,
  description: COPY.pages.contact.lead,
  path: "/kontakt",
});

export default function ContactPage() {
  return (
    <ProsePage
      title={COPY.pages.contact.title}
      lead={COPY.pages.contact.lead}
    >
      <div className="max-w-md rounded-md border border-border bg-surface p-6">
        <h2 className="u-eyebrow mb-5 text-paper-faint">{COPY.pages.contact.infoTitle}</h2>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-paper-faint">{COPY.contact.phone}</dt>
            <dd className="u-numeric mt-1">
              <a href={SITE.contact.phoneHref} className="text-paper transition-colors hover:text-accent">
                {SITE.contact.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-paper-faint">{COPY.contact.email}</dt>
            <dd className="mt-1">
              <a href={`mailto:${SITE.contact.email}`} className="text-paper transition-colors hover:text-accent">
                {SITE.contact.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-paper-faint">Adresa</dt>
            <dd className="mt-1 text-paper">
              {SITE.contact.address}
              <br />
              {SITE.contact.postalCode} {SITE.contact.city}, {SITE.contact.country}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 max-w-[68ch] text-sm leading-relaxed text-paper-faint">
        {COPY.pages.contact.note}
      </p>
    </ProsePage>
  );
}
