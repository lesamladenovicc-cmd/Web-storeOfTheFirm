import "server-only";

import { SITE } from "@/config/site";
import { serverEnv } from "@/lib/env";
import { formatPhone } from "@/lib/format";
import { absoluteUrl } from "@/lib/seo";

/**
 * EMAIL — optional by design.
 *
 * Without RESEND_API_KEY this module no-ops. Inquiries still persist and
 * still appear in /dashboard/upiti, so the build is never blocked on an
 * email vendor and a mail outage never loses a lead.
 *
 * Called with `void` (fire-and-forget): the visitor's success screen
 * must not wait on, or fail because of, an SMTP round trip.
 */

export type InquiryEmailInput = {
  to: string;
  sellerName: string;
  listingTitle: string;
  listingSlug: string;
  senderName: string;
  senderPhone: string | null;
  senderEmail: string | null;
  message: string;
};

export function isEmailConfigured(): boolean {
  const { resendApiKey, resendFrom } = serverEnv();
  return Boolean(resendApiKey && resendFrom);
}

export async function sendInquiryEmail(input: InquiryEmailInput): Promise<boolean> {
  const { resendApiKey, resendFrom } = serverEnv();
  if (!resendApiKey || !resendFrom) return false;

  const url = absoluteUrl(`/oglas/${input.listingSlug}`);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [input.to],
        // Lets the seller hit Reply and reach the buyer directly.
        ...(input.senderEmail ? { reply_to: input.senderEmail } : {}),
        subject: `Novi upit: ${input.listingTitle}`,
        text: buildText(input, url),
        html: buildHtml(input, url),
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

function buildText(i: InquiryEmailInput, url: string): string {
  return [
    `Poštovani ${i.sellerName},`,
    "",
    `Dobili ste novi upit za oglas "${i.listingTitle}".`,
    "",
    `Ime: ${i.senderName}`,
    i.senderPhone ? `Telefon: ${formatPhone(i.senderPhone)}` : null,
    i.senderEmail ? `E-mail: ${i.senderEmail}` : null,
    "",
    "Poruka:",
    i.message,
    "",
    `Oglas: ${url}`,
    "",
    `— ${SITE.name}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/** Inline styles only — email clients strip <style> blocks. */
function buildHtml(i: InquiryEmailInput, url: string): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#4b5568;font-size:14px">${label}</td>` +
    `<td style="padding:4px 0;color:#14213a;font-size:14px"><strong>${esc(value)}</strong></td></tr>`;

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#efe9dd;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #d3c9b3;border-radius:8px;padding:28px">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7f521c">${esc(SITE.name)}</p>
    <h1 style="margin:0 0 18px;font-size:20px;color:#14213a">Novi upit za oglas</h1>
    <p style="margin:0 0 18px;font-size:15px;color:#14213a">
      Poštovani ${esc(i.sellerName)}, dobili ste upit za oglas
      <strong>${esc(i.listingTitle)}</strong>.
    </p>
    <table style="border-collapse:collapse;margin-bottom:18px">
      ${row("Ime", i.senderName)}
      ${i.senderPhone ? row("Telefon", formatPhone(i.senderPhone)) : ""}
      ${i.senderEmail ? row("E-mail", i.senderEmail) : ""}
    </table>
    <div style="border-left:3px solid #c4935f;padding:2px 0 2px 14px;margin-bottom:22px">
      <p style="margin:0;font-size:15px;line-height:1.6;color:#14213a;white-space:pre-wrap">${esc(i.message)}</p>
    </div>
    <a href="${esc(url)}" style="display:inline-block;background:#c4935f;color:#14213a;text-decoration:none;padding:11px 20px;border-radius:4px;font-weight:600;font-size:14px">Otvori oglas</a>
  </div>
</div>`;
}

/** Buyer-supplied text goes into HTML; escape it. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
