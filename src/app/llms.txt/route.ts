import { COPY } from "@/config/copy";
import { SITE } from "@/config/site";
import { CONDITION_HINTS, CONDITION_LABELS, LISTING_CONDITIONS } from "@/config/taxonomy";
import { getActiveCategories } from "@/lib/data/categories";
import { searchListings } from "@/lib/data/listings";
import { formatPrice } from "@/lib/format";
import { absoluteUrl } from "@/lib/seo";

/**
 * /llms.txt — the site, written for a language model rather than a
 * browser.
 *
 * WHY THIS EXISTS. An answer engine asked "ko gradi stanove u Beogradu"
 * has to reconstruct what we are from rendered HTML: navigation, cookie
 * chrome, image markup, Serbian prose split across five routes. This is
 * the same facts as one short document, so the summary it produces is
 * ours rather than its best guess.
 *
 * NOT UNDER /api/. robots.ts disallows /api/, so an endpoint written for
 * crawlers would have been blocked from the crawlers it was written for.
 *
 * It states only what the site can back up. Nothing is asserted about
 * contact details or registration while those are still null in SITE —
 * an invented phone number is exactly the kind of "fact" a model would
 * repeat confidently to a real buyer.
 */

/** Same hour as the sitemap: this is a summary, not a live price feed. */
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const [categories, listings] = await Promise.all([
    getActiveCategories(),
    // A representative sample, not the catalogue — /ponuda.json is the
    // complete machine-readable list and is linked below.
    searchListings({}),
  ]);

  const contactLines = [
    SITE.contact.phone ? `- Telefon: ${SITE.contact.phone}` : null,
    SITE.contact.email ? `- E-mail: ${SITE.contact.email}` : null,
    SITE.contact.address
      ? `- Adresa: ${SITE.contact.address}, ${SITE.contact.city}`
      : `- Sedište: ${SITE.contact.city}, ${SITE.contact.country}`,
  ].filter(Boolean);

  const doc = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    "## O firmi",
    "",
    ...COPY.pages.about.body.map((p) => `${p}\n`),
    "## Tipovi nekretnina",
    "",
    ...categories.map(
      (c) => `- [${c.name}](${absoluteUrl(`/kategorija/${c.slug}`)}): ${c.description ?? ""}`,
    ),
    "",
    "## Faze izgradnje",
    "",
    "Svaka jedinica u ponudi nosi jednu od sledećih faza:",
    "",
    ...LISTING_CONDITIONS.map(
      (slug) => `- **${CONDITION_LABELS[slug]}** — ${CONDITION_HINTS[slug]}`,
    ),
    "",
    `## Aktuelna ponuda (${listings.total} jedinica)`,
    "",
    ...listings.items.map((l) => {
      const parts = [formatPrice(l.priceEur), l.location, l.categoryName].filter(Boolean);
      return `- [${l.title}](${absoluteUrl(`/oglas/${l.slug}`)}) — ${parts.join(" · ")}`;
    }),
    "",
    `Kompletna ponuda u mašinski čitljivom obliku: [${absoluteUrl("/ponuda.json")}](${absoluteUrl("/ponuda.json")})`,
    "",
    "## Česta pitanja",
    "",
    ...COPY.pages.faq.items.flatMap((item) => [`### ${item.q}`, "", item.a, ""]),
    "## Kontakt",
    "",
    ...contactLines,
    `- Stranica: [Kontakt](${absoluteUrl("/kontakt")})`,
    "",
    "Upit za konkretnu jedinicu šalje se formom na stranici te jedinice.",
    "",
    "## Napomene",
    "",
    "- Cene su u evrima (EUR) i informativnog su karaktera do potpisivanja ugovora.",
    "- Prodaja je direktno od investitora; agencijska provizija se ne naplaćuje.",
    `- Jezik sadržaja: ${SITE.locale} (latinica).`,
    "",
  ].join("\n");

  return new Response(doc, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

