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
 *
 * Rendered as a plate with register marks and a signal index tab. The
 * reveal/call button is the page's primary action and the only accent
 * fill in the panel.
 */
const UI_LABEL =
  "font-[family-name:var(--font-ui)] text-xs font-semibold tracking-[0.12em] uppercase transition-colors duration-200";

export function ContactPanel({ listing }: { listing: Listing }) {
  const [revealed, setRevealed] = useState(false);

  const phone = listing.contactPhone;
  const isSold = listing.status === "prodato";
  const mailSubject = `${COPY.contact.emailSubjectPrefix} ${listing.title}`;

  return (
    <aside className="u-marks u-tab border-line bg-panel border">
      <div className="border-line border-b p-6 sm:p-7">
        <h2 className="u-eyebrow text-fg-faint">{COPY.contact.title}</h2>

        <p className="font-display text-h3 text-fg mt-4 font-semibold">
          {listing.contactName || COPY.contact.seller}
        </p>
        {listing.location ? (
          <p className="u-eyebrow text-fg-faint mt-2">{listing.location}</p>
        ) : null}

        {isSold ? (
          <p className="border-danger/40 bg-danger-soft text-danger mt-5 border px-3 py-2.5 text-sm">
            {COPY.listing.soldNotice}
          </p>
        ) : null}
      </div>

      {!isSold ? (
        <div className="space-y-2.5 p-6 sm:p-7">
          {phone ? (
            revealed ? (
              <a
                href={telHref(phone)}
                className="u-numeric border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover flex h-14 items-center justify-center border text-lg font-semibold transition-colors duration-200"
              >
                {formatPhone(phone)}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className={`${UI_LABEL} border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover flex h-14 w-full items-center justify-center gap-3 border px-4`}
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
                    No opacity here: faded text over the accent fails AA. */}
                <span className="u-numeric text-sm font-medium tracking-normal normal-case">
                  {maskPhone(phone)}
                </span>
              </button>
            )
          ) : null}

          {listing.contactEmail ? (
            <a
              href={`mailto:${listing.contactEmail}?subject=${encodeURIComponent(mailSubject)}`}
              className={`${UI_LABEL} border-fg bg-fg text-ground hover:text-fg flex h-12 items-center justify-center border hover:bg-transparent`}
            >
              {COPY.contact.sendEmail}
            </a>
          ) : null}

          {phone ? (
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={viberHref(phone)}
                className={`${UI_LABEL} border-line-strong text-fg-muted hover:border-fg hover:text-fg flex h-11 items-center justify-center border text-[0.6875rem]`}
              >
                {COPY.contact.viber}
              </a>
              <a
                href={whatsappHref(phone)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${UI_LABEL} border-line-strong text-fg-muted hover:border-fg hover:text-fg flex h-11 items-center justify-center border text-[0.6875rem]`}
              >
                {COPY.contact.whatsapp}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {!isSold ? (
        <div className="border-line border-t p-6 sm:p-7">
          <InquiryForm listingId={listing.id} />
        </div>
      ) : null}
    </aside>
  );
}
