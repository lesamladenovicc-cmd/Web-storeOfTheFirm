/**
 * SEO — metadata and JSON-LD builders.
 *
 * Every public route goes through `buildMetadata` so that canonical,
 * locale and OG handling can never drift between pages.
 */

import type { Metadata } from "next";
import { SITE, SITE_URL } from "@/config/site";
import { CONDITION_SCHEMA_URL, STATUS_SCHEMA_AVAILABILITY } from "@/config/taxonomy";
import { toPlainText, truncate } from "./format";
import { publicImageUrl } from "./images";
import type { Listing } from "@/types/domain";

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
 * When `priceRsd` is null ("Po dogovoru") the entire `offers` block is
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

  if (listing.priceRsd !== null) {
    jsonLd.offers = {
      "@type": "Offer",
      url,
      priceCurrency: SITE.currency,
      price: String(listing.priceRsd),
      priceValidUntil: priceValidUntil(now),
      availability: STATUS_SCHEMA_AVAILABILITY[listing.status],
      // Omitted rather than emitted as null: a null value is invalid
      // markup, whereas an absent optional property is fine.
      ...(condition ? { itemCondition: condition } : {}),
      seller: {
        "@type": "Organization",
        name: SITE.name,
      },
    };
  }

  return jsonLd;
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

export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    legalName: SITE.legalName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.png"),
    description: SITE.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.contact.address,
      addressLocality: SITE.contact.city,
      postalCode: SITE.contact.postalCode,
      addressCountry: "RS",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE.contact.phone,
      email: SITE.contact.email,
      contactType: "customer service",
      availableLanguage: ["sr"],
    },
  };
}

export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: absoluteUrl("/"),
    inLanguage: SITE.locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/oglasi")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
