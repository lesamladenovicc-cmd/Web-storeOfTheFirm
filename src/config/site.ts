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

/**
 * UNKNOWN DETAILS ARE `null`, NEVER A PLACEHOLDER STRING.
 *
 * The previous build shipped a fabricated address, phone and PIB, and
 * those flowed straight into the footer and the Organization JSON-LD —
 * i.e. we were publishing a false registered identity to search engines.
 * Every consumer must therefore treat `null` as "omit this row / omit
 * this JSON-LD key", never as an empty string.
 *
 * `city` and `country` are NOT null: BG Building demonstrably builds in
 * Belgrade, so that much is a fact and it is what `areaServed` needs.
 */
type SiteContact = {
  email: string | null;
  phone: string | null;
  /** Pre-built `tel:` href — null whenever `phone` is null. */
  phoneHref: string | null;
  address: string | null;
  city: string;
  postalCode: string | null;
  country: string;
};

const CONTACT: SiteContact = {
  email: "jadrankogojak@gmail.com",
  phone: "064 170 2827",
  phoneHref: "tel:+381641702827",
  /** TODO(BG Building): street address still unknown — stays null. */
  address: null,
  city: "Beograd",
  postalCode: null,
  country: "Srbija",
};

/**
 * Opening hours.
 *
 * `opens`/`closes` are 24h HH:MM because that is what schema.org's
 * OpeningHoursSpecification requires; `hours` is what the page shows.
 *
 * TODO(BG Building): CONFIRM BEFORE LAUNCH. These came from the client
 * with "valjda je ovako" attached — publishing hours a visitor plans a
 * site visit around, and being wrong, is worse than publishing none.
 */
export const WORKING_HOURS = [
  {
    label: "Ponedeljak–petak",
    hours: "07–17h",
    schemaDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "07:00",
    closes: "17:00",
  },
  {
    label: "Subota",
    hours: "08–17h",
    schemaDays: ["Saturday"],
    opens: "08:00",
    closes: "17:00",
  },
] as const;

type SiteRegistration = {
  pib: string | null;
  maticniBroj: string | null;
};

/** TODO(BG Building): fill in from the APR extract. */
const REGISTRATION: SiteRegistration = {
  pib: null,
  maticniBroj: null,
};

export const SITE = {
  name: "BG Building",
  /** Used in <title> templates and JSON-LD Organization. */
  legalName: "BG Building d.o.o. Beograd",
  /** One-line positioning, shown in the hero and meta description. */
  tagline: "Stanovi u novogradnji, direktno od investitora",
  description:
    "BG Building gradi i prodaje stanove, lokale i poslovni prostor u novogradnji u Beogradu. Kupovina direktno od investitora — bez agencijske provizije, uz uvid u projekat i dinamiku radova.",
  url: SITE_URL,
  locale: "sr-RS",
  /** OpenGraph locale uses an underscore, not a hyphen. */
  ogLocale: "sr_RS",
  /**
   * Property in Serbia is priced in euros — every portal, every bank
   * loan, every notary contract. A dinar figure on a listing would have
   * to be converted in the buyer's head.
   *
   * `currency` is the ISO code and goes into JSON-LD `priceCurrency`;
   * `currencySuffix` is what the page shows. Serbian convention puts the
   * symbol after the amount: "242.000 €".
   */
  currency: "EUR",
  currencySuffix: "€",

  contact: CONTACT,
  registration: REGISTRATION,
} as const;

/** Primary navigation, rendered by SiteHeader and MobileNav. */
export const MAIN_NAV = [
  { href: "/prodaja", label: "Prodaja" },
  { href: "/izdavanje", label: "Izdavanje" },
  { href: "/o-nama", label: "O nama" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

/**
 * Footer link groups.
 *
 * The category links are hardcoded to the seeded slugs rather than read
 * from the database: the footer renders on every route, including the
 * fully static legal pages, and a query here would opt them all out of
 * static generation for three links that never change.
 */
export const FOOTER_NAV = [
  {
    title: "Ponuda",
    links: [
      { href: "/prodaja", label: "Na prodaju" },
      { href: "/izdavanje", label: "Za izdavanje" },
      { href: "/kategorija/stanovi", label: "Stanovi" },
      { href: "/kategorija/lokali", label: "Lokali" },
      { href: "/oglasi", label: "Cela ponuda" },
    ],
  },
  {
    title: "Informacije",
    links: [
      { href: "/o-nama", label: "O nama" },
      { href: "/kontakt", label: "Kontakt" },
      { href: "/o-nama#pitanja", label: "Česta pitanja" },
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
  /**
   * Euros, not dinars — mirrors the CHECK in migration 0012. Far above
   * anything we will list, low enough to catch a stray extra zero.
   */
  priceMax: 100_000_000,

  /* Property attribute bounds — mirrored by listingAttributesSchema.
     Deliberately generous: these exist to reject typos and nonsense
     (a 4-digit room count, a negative area), not to encode what we
     think we will ever build. */
  kvadraturaMax: 10_000,
  brojSobaMax: 20,
  brojKupatilaMax: 20,
  terasaMax: 1_000,
  /** Free-text attributes: sprat, grejanje, orijentacija, rok useljenja. */
  attrTextMax: 60,

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
 *   /kategorija/[slug]         –   — SSR (reads searchParams for filters)
 *   /oglas/[slug]           3600   — 1 h, plus on-demand revalidatePath
 *   /sitemap.xml            3600   — 1 h
 *   /llms.txt               3600   — 1 h, summary for answer engines
 *   /ponuda.json            3600   — 1 h, full machine-readable catalogue
 *   /oglasi                    –   — SSR per request (reads searchParams)
 *   /dashboard/**              –   — force-dynamic
 */
