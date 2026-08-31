/**
 * SITE — brand identity and global constants.
 *
 * This is the file you edit when the brand, domain or niche framing changes.
 * Nothing here may be imported into a migration or referenced by the database.
 */

/**
 * Canonical origin, used for canonical URLs, OG tags and the sitemap.
 * Falls back to the Vercel-provided URL on previews, then to localhost.
 */
export const SITE_URL: string = (() => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
})();

export const SITE = {
  /** Placeholder brand — swap here when the real name is decided. */
  name: "Jadranko",
  /** Used in <title> templates and JSON-LD Organization. */
  legalName: "Jadranko d.o.o.",
  /** One-line positioning, shown in the hero and meta description. */
  tagline: "Polovne i nove mašine iz proverenih ruku",
  description:
    "Oglasi za polovne i nove mašine, alate i opremu. Proverena ponuda, direktan kontakt sa prodavcem, bez posrednika.",
  url: SITE_URL,
  locale: "sr-RS",
  /** OpenGraph locale uses an underscore, not a hyphen. */
  ogLocale: "sr_RS",
  currency: "RSD",
  currencySuffix: "din",

  /** Company contact — placeholder until real details are supplied. */
  contact: {
    email: "kontakt@jadranko.rs",
    phone: "+381 11 000 0000",
    phoneHref: "tel:+381110000000",
    address: "Bulevar oslobođenja 1",
    city: "Novi Sad",
    postalCode: "21000",
    country: "Srbija",
  },

  /** Registration identifiers — placeholder, shown in the footer. */
  registration: {
    pib: "000000000",
    maticniBroj: "00000000",
  },
} as const;

/** Primary navigation, rendered by SiteHeader and MobileNav. */
export const MAIN_NAV = [
  { href: "/oglasi", label: "Svi oglasi" },
  { href: "/o-nama", label: "O nama" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

/** Footer link groups. */
export const FOOTER_NAV = [
  {
    title: "Ponuda",
    links: [
      { href: "/oglasi", label: "Svi oglasi" },
      { href: "/oglasi?sort=najnovije", label: "Najnoviji oglasi" },
    ],
  },
  {
    title: "Informacije",
    links: [
      { href: "/o-nama", label: "O nama" },
      { href: "/kontakt", label: "Kontakt" },
    ],
  },
  {
    title: "Pravni podaci",
    links: [
      { href: "/uslovi-koriscenja", label: "Uslovi korišćenja" },
      { href: "/politika-privatnosti", label: "Politika privatnosti" },
    ],
  },
] as const;

/* ------------------------------------------------------------------ */
/* Operational limits — enforced server-side, surfaced in the UI       */
/* ------------------------------------------------------------------ */

export const LIMITS = {
  /** Listings per page on /oglasi and /kategorija/[slug]. */
  pageSize: 24,
  /** Cards in the homepage "Najnoviji oglasi" strip. */
  homepageListings: 8,
  /** Related listings on a detail page. */
  relatedListings: 4,

  /** Images per listing. */
  maxImages: 10,
  /** Per-file upload ceiling; mirrored by the Storage bucket config. */
  maxImageBytes: 5 * 1024 * 1024,
  /** Longest edge after client-side downscale, before upload. */
  maxImageEdge: 1600,
  /** WebP quality used by the client-side canvas encoder. */
  imageQuality: 0.82,

  /** Field bounds — mirrored exactly by the zod schemas. */
  titleMin: 5,
  titleMax: 120,
  descriptionMin: 20,
  descriptionMax: 5000,
  locationMin: 2,
  locationMax: 80,
  priceMax: 2_000_000_000,

  /** Inquiry anti-spam. */
  inquiriesPerHourPerIp: 5,
  inquiryMessageMin: 10,
  inquiryMessageMax: 2000,
  /** A human takes longer than this to fill the form; bots do not. */
  inquiryMinFillMs: 3000,
} as const;

/**
 * ISR POLICY (documentation only — do not import).
 *
 * Next.js requires `export const revalidate` to be a statically
 * analyzable literal, so it cannot reference this object. Each route
 * therefore declares its own literal with a comment pointing here.
 * Keep this table and the route literals in sync.
 *
 *   /                        300   — 5 min, latest-listings strip
 *   /kategorija/[slug]      3600   — 1 h, SSG + ISR
 *   /oglas/[slug]           3600   — 1 h, plus on-demand revalidatePath
 *   /sitemap.xml            3600   — 1 h
 *   /oglasi                    –   — SSR per request (reads searchParams)
 *   /dashboard/**              –   — force-dynamic
 */
