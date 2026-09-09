import { SITE } from "@/config/site";
import { CONDITION_LABELS } from "@/config/taxonomy";
import { getActiveCategories } from "@/lib/data/categories";
import { getFeedListings } from "@/lib/data/listings";
import { absoluteUrl } from "@/lib/seo";

/**
 * /ponuda.json — the whole active catalogue in one machine-readable
 * document.
 *
 * Complements /llms.txt: that one explains who we are, this one is the
 * inventory. A crawler answering "koliko košta dvosoban na Vračaru" gets
 * every unit with price, area, rooms and phase in a single fetch instead
 * of paginating twenty HTML pages and parsing Serbian prose out of them.
 *
 * NOT UNDER /api/ — robots.ts disallows that prefix, which would have
 * blocked exactly the readers this is for.
 *
 * Only `aktivan` listings appear. Drafts are not public and sold units
 * are noindex on their own pages; including either here would contradict
 * what the rest of the site tells crawlers.
 *
 * Prices are whole euros, `null` meaning "po dogovoru" — never 0, for
 * the same reason the JSON-LD omits the offer entirely in that case.
 */
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const [categories, listings] = await Promise.all([getActiveCategories(), getFeedListings()]);

  const body = {
    // A self-describing envelope: a consumer should not have to guess
    // the currency or that "faza" is a build stage rather than wear.
    izvor: {
      naziv: SITE.name,
      opis: SITE.description,
      url: absoluteUrl("/"),
      jezik: SITE.locale,
      valuta: SITE.currency,
      napomena:
        "Prodaja direktno od investitora, bez agencijske provizije. Cene su informativne do zaključenja ugovora.",
      generisano: new Date().toISOString(),
    },
    tipovi: categories.map((c) => ({
      slug: c.slug,
      naziv: c.name,
      opis: c.description,
      url: absoluteUrl(`/kategorija/${c.slug}`),
    })),
    ukupno: listings.length,
    nekretnine: listings.map((l) => {
      const a = l.attributes;
      return {
        sifra: l.id.slice(0, 8).toUpperCase(),
        naziv: l.title,
        url: absoluteUrl(`/oglas/${l.slug}`),
        tip: l.categoryName,
        lokacija: l.location || null,
        cena_eur: l.priceEur,
        cena_po_m2:
          l.priceEur !== null && a.kvadratura ? Math.round(l.priceEur / a.kvadratura) : null,
        po_dogovoru: l.priceEur === null,
        faza: l.condition ? CONDITION_LABELS[l.condition] : null,
        kvadratura_m2: a.kvadratura ?? null,
        broj_soba: a.brojSoba ?? null,
        sprat: a.sprat ?? null,
        broj_kupatila: a.brojKupatila ?? null,
        terasa_m2: a.terasaM2 ?? null,
        orijentacija: a.orijentacija ?? null,
        grejanje: a.grejanje ?? null,
        lift: a.lift ?? null,
        garazno_mesto: a.garaznoMesto ?? null,
        uknjizen: a.uknjizen ?? null,
        rok_useljenja: a.rokUseljenja ?? null,
        energetski_razred: a.energetskiRazred ?? null,
        objavljeno: l.publishedAt,
        azurirano: l.updatedAt,
      };
    }),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
