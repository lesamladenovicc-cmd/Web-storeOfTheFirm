"use client";

import { useState } from "react";
import { COPY } from "@/config/copy";
import { formatPhone, maskPhone, telHref, viberHref, whatsappHref } from "@/lib/format";
import type { Listing } from "@/types/domain";
import { InquiryForm } from "./InquiryForm";

/**
 * The conversion unit: direct reveal AND an on-site inquiry form.
 *
 * The phone number is present in the server-rendered HTML — it must be,
 * for crawlers and for JS-off users — and is only visually masked until
 * the reveal click. This is friction against casual scraping, not a
 * security measure, and is not treated as one.
 */
export function ContactPanel({ listing }: { listing: Listing }) {
  const [revealed, setRevealed] = useState(false);

  const phone = listing.contactPhone;
  const isSold = listing.status === "prodato";
  const mailSubject = `${COPY.contact.emailSubjectPrefix} ${listing.title}`;

  return (
    <aside className="rounded-md border border-border bg-surface">
      <div className="border-b border-border p-5">
        <h2 className="u-eyebrow text-paper-faint">{COPY.contact.title}</h2>

        <p className="mt-3 font-display text-lg font-semibold text-paper">
          {listing.contactName || COPY.contact.seller}
        </p>
        {listing.location ? (
          <p className="u-numeric mt-1 text-sm text-paper-faint">{listing.location}</p>
        ) : null}

        {isSold ? (
          <p className="mt-4 rounded-sm border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {COPY.listing.soldNotice}
          </p>
        ) : null}
      </div>

      {!isSold ? (
        <div className="space-y-3 p-5">
          {phone ? (
            revealed ? (
              <a
                href={telHref(phone)}
                className="u-numeric flex h-12 items-center justify-center rounded-sm bg-accent text-lg font-semibold text-bg transition-colors hover:bg-accent-hover"
              >
                {formatPhone(phone)}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-accent font-medium text-bg transition-colors hover:bg-accent-hover"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M5.5 1.5 7 4.5 5.5 6c.8 1.7 2.3 3.2 4 4L11 8.5l3 1.5v3c0 .6-.4 1-1 1C7 14 2 9 2 2.5c0-.6.4-1 1-1h2.5Z" />
                </svg>
                {COPY.contact.revealPhone}
                {/* Masked digits keep the button from reflowing on reveal.
                    No opacity here: 70% ink over the accent blends to
                    #5b250e (3.67:1) and fails AA — axe caught it. */}
                <span className="u-numeric text-sm">{maskPhone(phone)}</span>
              </button>
            )
          ) : null}

          {listing.contactEmail ? (
            <a
              href={`mailto:${listing.contactEmail}?subject=${encodeURIComponent(mailSubject)}`}
              className="flex h-11 items-center justify-center rounded-sm border border-border-strong text-sm font-medium text-paper transition-colors hover:border-accent hover:text-accent"
            >
              {COPY.contact.sendEmail}
            </a>
          ) : null}

          {phone ? (
            <div className="grid grid-cols-2 gap-3">
              <a
                href={viberHref(phone)}
                className="flex h-10 items-center justify-center rounded-sm border border-border text-sm text-paper-muted transition-colors hover:border-border-strong hover:text-paper"
              >
                {COPY.contact.viber}
              </a>
              <a
                href={whatsappHref(phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center justify-center rounded-sm border border-border text-sm text-paper-muted transition-colors hover:border-border-strong hover:text-paper"
              >
                {COPY.contact.whatsapp}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {!isSold ? (
        <div className="border-t border-border p-5">
          <InquiryForm listingId={listing.id} />
        </div>
      ) : null}
    </aside>
  );
}
