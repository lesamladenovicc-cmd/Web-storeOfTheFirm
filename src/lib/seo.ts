/**
 * SEO — metadata and JSON-LD builders.
 *
 * Every public route goes through `buildMetadata` so that canonical,
 * locale and OG handling can never drift between pages.
 */

import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { SITE, SITE_URL } from "@/config/site";
import {
  CONDITION_LABELS,
  CONDITION_SCHEMA_URL,
  STATUS_SCHEMA_AVAILABILITY,
} from "@/config/taxonomy";
import { toPlainText, truncate } from "./format";
import { publicImageUrl } from "./images";
import type { Listing, ListingCard } from "@/types/domain";

/** Absolute URL for canonical tags, OG and JSON-LD. */
export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type BuildMetadataInput = {
  title?: string;
  description?: string;
  /** Site-relative path, used for the canonical URL. */
  path?: string;
  /** Absolute image URLs for OG/Twitter. */
  images?: string[];
  noIndex?: boolean;
  /** Extra <meta> pairs, e.g. product:price:amount. */
  other?: Record<string, string | number>;
};

export function buildMetadata({
  title,
  description,
  path = "/",
  images,
  noIndex = false,
  other,
}: BuildMetadataInput = {}): Metadata {
  const url = absoluteUrl(path);
  const desc = truncate(toPlainText(description ?? SITE.description), 155);

  // Defining `openGraph` at all SUPPRESSES Next's opengraph-image.tsx
  // file-convention injection for that route — verified in the build
  // output: the homepage (which does not call this helper) gets the
  // generated card, while every route that does would silently ship no
  // og:image. So the fallback is referenced explicitly. The route works
  // without Next's cache-busting query.
  const fallbackOgImage = absoluteUrl("/opengraph-image");
  const ogImages = (images?.length ? images : [fallbackOgImage]).map((img) => ({
    url: img,
    width: 1200,
    height: 630,
    alt: title ?? SITE.name,
  }));

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      title: title ?? SITE.name,
      description: desc,
      url,
      siteName: SITE.name,
      locale: SITE.ogLocale,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: title ?? SITE.name,
      description: desc,
      images: images?.length ? images : [fallbackOgImage],
    },
    ...(other ? { other } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD                                                             */
/* ------------------------------------------------------------------ */

export type JsonLdObject = Record<string, unknown>;

/** One year out — Google warns when priceValidUntil is absent or past. */
function priceValidUntil(from: Date = new Date()): string {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Product JSON-LD for a listing detail page.
 *
 * When `priceEur` is null ("Po dogovoru") the entire `offers` block is
 * OMITTED. Emitting price "0" or a null price produces an invalid-markup
 * warning in Search Console; a Product without offers is valid.
 */
export function productJsonLd(listing: Listing, now: Date = new Date()): JsonLdObject {
  const url = absoluteUrl(`/oglas/${listing.slug}`);
  const images = listing.images.length
    ? listing.images.map((img) => publicImageUrl(img.storagePath))
    : listing.coverImagePath
      ? [publicImageUrl(listing.coverImagePath)]
      : [];

  // Always set in practice — publishing requires a condition — but the
  // type allows null for drafts, and a draft is never rendered here.
  const condition = listing.condition ? CONDITION_SCHEMA_URL[listing.condition] : null;

  const jsonLd: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: truncate(toPlainText(listing.description), 300),
    sku: listing.id,
    url,
  };

  if (condition) jsonLd.itemCondition = condition;

  if (images.length) jsonLd.image = images;
  if (listing.categoryName) jsonLd.category = listing.categoryName;

  jsonLd.brand = { "@id": ORG_ID };
  if (listing.publishedAt) jsonLd.datePublished = listing.publishedAt;
  jsonLd.dateModified = listing.updatedAt;

  // Build phase has no OfferItemCondition that means it (see the note on
  // CONDITION_SCHEMA_URL), so it rides along as a named property, where
  // an answer engine can still read it as a fact about the unit.
  const extra: JsonLdObject[] = [];
  if (listing.condition) {
    extra.push({
      "@type": "PropertyValue",
      name: COPY.listing.conditionLabel,
      value: CONDITION_LABELS[listing.condition],
    });
  }
  const a = listing.attributes;
  if (a.uknjizen !== undefined) {
    extra.push({
      "@type": "PropertyValue",
      name: COPY.listing.attrUknjizen,
      value: a.uknjizen ? COPY.common.yes : COPY.common.no,
    });
  }
  if (a.rokUseljenja) {
    extra.push({
      "@type": "PropertyValue",
      name: COPY.listing.attrRokUseljenja,
      value: a.rokUseljenja,
    });
  }
  if (extra.length) jsonLd.additionalProperty = extra;

  if (listing.priceEur !== null) {
    jsonLd.offers = {
      "@type": "Offer",
      url,
      priceCurrency: SITE.currency,
      price: String(listing.priceEur),
      priceValidUntil: priceValidUntil(now),
      availability: STATUS_SCHEMA_AVAILABILITY[listing.status],
      // Omitted rather than emitted as null: a null value is invalid
      // markup, whereas an absent optional property is fine.
      ...(condition ? { itemCondition: condition } : {}),
      // Points at the Organization node the root layout already emits,
      // rather than restating a second, unlinked copy of the company.
      seller: { "@id": ORG_ID },
    };
  }

  return jsonLd;
}

/**
 * The property itself, as an Accommodation.
 *
 * Product/Offer above is what earns a Google rich result; this node is
 * what makes the page legible as REAL ESTATE rather than merchandise —
 * floor area, room count and locality in the properties an answer engine
 * already knows how to read, instead of buried in Serbian prose.
 *
 * Returns null when we know nothing beyond the price: a node carrying
 * only `@type` adds no information and is noise in the graph.
 */
export function accommodationJsonLd(listing: Listing): JsonLdObject | null {
  const a = listing.attributes;
  const url = absoluteUrl(`/oglas/${listing.slug}`);

  const node = compact({
    "@type": "Accommodation",
    "@id": `${url}#nekretnina`,
    name: listing.title,
    url,
    // The unit sits inside a locality; street address is deliberately
    // NOT emitted — `location` is a neighbourhood ("Vračar, Beograd"),
    // not a postal address, and mislabelling it would be a false claim.
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.location || SITE.contact.city,
      addressCountry: "RS",
    },
    numberOfRooms: a.brojSoba,
    numberOfBathroomsTotal: a.brojKupatila,
    floorLevel: a.sprat,
    floorSize: a.kvadratura
      ? { "@type": "QuantitativeValue", value: a.kvadratura, unitCode: "MTK" }
      : undefined,
    tourBookingPage: url,
  });

  const amenities: JsonLdObject[] = [];
  if (a.lift !== undefined) {
    amenities.push({ "@type": "LocationFeatureSpecification", name: "Lift", value: a.lift });
  }
  if (a.garaznoMesto !== undefined) {
    amenities.push({
      "@type": "LocationFeatureSpecification",
      name: COPY.listing.attrGaraznoMesto,
      value: a.garaznoMesto,
    });
  }
  if (a.terasaM2) {
    amenities.push({
      "@type": "LocationFeatureSpecification",
      name: COPY.listing.attrTerasa,
      value: true,
    });
  }
  if (amenities.length) node.amenityFeature = amenities;

  // `@type`, `@id`, `name`, `url`, `address` and `tourBookingPage` are
  // always present, so anything at or below that count means no real
  // specification was entered.
  const informative = Object.keys(node).length > 6 || amenities.length > 0;
  return informative ? node : null;
}

/**
 * The catalogue page as an enumerable list.
 *
 * Without this an answer engine asked "what does BG Building have in
 * Vračar?" has to scrape rendered HTML and guess. With it, /oglasi and
 * every category page hand over an ordered list of units with names,
 * URLs and prices in one object.
 *
 * `ListItem.item` is an inline Product rather than a bare URL: a crawler
 * that never fetches the detail page still comes away with the price.
 * Positions are 1-based and continue across pagination, so page 2 starts
 * at 25 rather than restating 1–24.
 */
export function itemListJsonLd({
  listings,
  path,
  name,
  description,
  total,
  startPosition = 1,
}: {
  listings: ListingCard[];
  path: string;
  name: string;
  description?: string;
  total: number;
  startPosition?: number;
}): JsonLdObject {
  const url = absoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#kolekcija`,
    url,
    name,
    ...(description ? { description } : {}),
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    inLanguage: SITE.locale,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      itemListElement: listings.map((listing, i) => {
        const itemUrl = absoluteUrl(`/oglas/${listing.slug}`);
        const product = compact({
          "@type": "Product",
          name: listing.title,
          url: itemUrl,
          category: listing.categoryName,
          image: listing.coverImagePath ? publicImageUrl(listing.coverImagePath) : undefined,
        });

        if (listing.priceEur !== null) {
          product.offers = {
            "@type": "Offer",
            price: String(listing.priceEur),
            priceCurrency: SITE.currency,
            availability: STATUS_SCHEMA_AVAILABILITY[listing.status],
            url: itemUrl,
          };
        }

        return {
          "@type": "ListItem",
          position: startPosition + i,
          item: product,
        };
      }),
    },
  };
}

/**
 * FAQPage — the format answer engines quote most directly.
 *
 * Google withdrew FAQ rich results for most sites in 2023, so this is
 * not chasing a SERP feature; it is here because an LLM summarising
 * "how does buying from BG Building work" gets clean question/answer
 * pairs instead of having to infer them from prose.
 *
 * Every answer must also be visible on the page. Marking up text a
 * visitor cannot see is a structured-data violation, which is why this
 * takes the same COPY entries the page renders.
 */
export function faqJsonLd(items: readonly { q: string; a: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Stable node ids, so every graph can point at the same two entities. */
export const ORG_ID = `${SITE_URL}/#organizacija`;
export const WEBSITE_ID = `${SITE_URL}/#sajt`;

/** Drops keys whose value is null/undefined/"" — invalid markup otherwise. */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ""),
  );
}

/**
 * The site-wide entity graph, emitted once from the root layout.
 *
 * `GeneralContractor` rather than a bare `Organization`: BG Building
 * builds what it sells, and the contractor subtype is a LocalBusiness,
 * which is what earns a local/knowledge panel. `additionalType` keeps
 * the property-seller reading as well.
 *
 * Contact and registration fields are null until the client supplies
 * them (see SITE.contact) and are OMITTED, never emitted empty — a
 * fabricated address or PIB in structured data is a false claim about a
 * real registered company.
 */
export function siteGraphJsonLd(): JsonLdObject {
  const org = compact({
    "@type": "GeneralContractor",
    "@id": ORG_ID,
    additionalType: "https://schema.org/RealEstateAgent",
    name: SITE.name,
    legalName: SITE.legalName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.png"),
    image: absoluteUrl("/logo.png"),
    description: SITE.description,
    areaServed: { "@type": "City", name: SITE.contact.city },
    knowsLanguage: ["sr-RS"],
    // TODO(BG Building): social profiles once they exist — sameAs is the
    // single strongest entity-reconciliation signal for answer engines.
    address: compact({
      "@type": "PostalAddress",
      streetAddress: SITE.contact.address,
      addressLocality: SITE.contact.city,
      postalCode: SITE.contact.postalCode,
      addressCountry: "RS",
    }),
    taxID: SITE.registration.pib,
    vatID: SITE.registration.pib,
  });

  const contactPoint = compact({
    "@type": "ContactPoint",
    telephone: SITE.contact.phone,
    email: SITE.contact.email,
    contactType: "sales",
    areaServed: "RS",
    availableLanguage: ["sr"],
  });
  // Only telephone/email carry information; without either the node is noise.
  if (SITE.contact.phone || SITE.contact.email) org.contactPoint = contactPoint;

  const website: JsonLdObject = {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE.name,
    url: absoluteUrl("/"),
    inLanguage: SITE.locale,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/oglasi")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return { "@context": "https://schema.org", "@graph": [org, website] };
}
