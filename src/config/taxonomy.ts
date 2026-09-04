/**
 * TAXONOMY — niche-agnostic classification layer.
 *
 * Database columns store ASCII slugs (`korisceno`); every human-readable
 * Serbian label lives here. Re-labelling or re-niching the store means
 * editing this file and the `categories` rows — never a component.
 *
 * Rules:
 *  - Enum SLUGS must match the Postgres enums in supabase/migrations/0001.
 *  - Labels are Serbian (Latin script) and may contain diacritics freely.
 *  - Categories are FLAT. There is no `parent_id` and there never will be.
 */

/* ------------------------------------------------------------------ */
/* Condition                                                           */
/* ------------------------------------------------------------------ */

export const LISTING_CONDITIONS = ["novo", "kao_novo", "korisceno", "neispravno"] as const;

export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  novo: "Novo",
  kao_novo: "Kao novo",
  korisceno: "Korišćeno",
  neispravno: "Neispravno",
};

/** Short helper text shown under the condition picker in the dashboard. */
export const CONDITION_HINTS: Record<ListingCondition, string> = {
  novo: "Nekorišćeno, u originalnom pakovanju.",
  kao_novo: "Korišćeno vrlo malo, bez vidljivih tragova.",
  korisceno: "Ispravno, sa vidljivim tragovima korišćenja.",
  neispravno: "Ne radi ili radi delimično — za delove ili popravku.",
};

/**
 * schema.org OfferItemCondition mapping used by Product JSON-LD.
 * `kao_novo` maps to UsedCondition rather than RefurbishedCondition —
 * "kao novo" means lightly used, not professionally refurbished.
 */
export const CONDITION_SCHEMA_URL: Record<ListingCondition, string> = {
  novo: "https://schema.org/NewCondition",
  kao_novo: "https://schema.org/UsedCondition",
  korisceno: "https://schema.org/UsedCondition",
  neispravno: "https://schema.org/DamagedCondition",
};

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export const LISTING_STATUSES = ["nacrt", "aktivan", "prodato"] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const STATUS_LABELS: Record<ListingStatus, string> = {
  nacrt: "Nacrt",
  aktivan: "Aktivan",
  prodato: "Prodato",
};

/** Only `aktivan` listings are publicly visible and indexable. */
export const PUBLIC_STATUS: ListingStatus = "aktivan";

export const STATUS_SCHEMA_AVAILABILITY: Record<ListingStatus, string> = {
  nacrt: "https://schema.org/OutOfStock",
  aktivan: "https://schema.org/InStock",
  prodato: "https://schema.org/SoldOut",
};

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export const USER_ROLES = ["admin", "seller"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  seller: "Prodavac",
};

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

export const SORT_OPTIONS = ["najnovije", "cena_rastuce", "cena_opadajuce"] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  najnovije: "Najnovije",
  cena_rastuce: "Cena: rastuće",
  cena_opadajuce: "Cena: opadajuće",
};

export const DEFAULT_SORT: SortOption = "najnovije";

/* ------------------------------------------------------------------ */
/* Category seed — mirrored into the `categories` table by seed.sql.   */
/* After launch the admin edits categories in the UI, not here.        */
/* ------------------------------------------------------------------ */

export type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  sort_order: number;
};

export const CATEGORY_SEED: CategorySeed[] = [
  {
    slug: "gradjevinske-masine",
    name: "Građevinske mašine",
    description: "Bageri, utovarivači, valjci, mešalice i prateća oprema.",
    sort_order: 10,
  },
  {
    slug: "poljoprivredne-masine",
    name: "Poljoprivredne mašine",
    description: "Traktori, priključne mašine, kombajni i oprema za ratarstvo.",
    sort_order: 20,
  },
  {
    slug: "industrijske-masine",
    name: "Industrijske mašine",
    description: "Mašine za proizvodnju, obradu metala i drveta.",
    sort_order: 30,
  },
  {
    slug: "viljuskari-i-transport",
    name: "Viljuškari i transport",
    description: "Viljuškari, paletari, dizalice i transportna sredstva.",
    sort_order: 40,
  },
  {
    slug: "alati-i-oprema",
    name: "Alati i oprema",
    description: "Ručni i električni alati, kompresori, agregati.",
    sort_order: 50,
  },
  {
    slug: "rezervni-delovi",
    name: "Rezervni delovi",
    description: "Delovi, potrošni materijal i dodatna oprema.",
    sort_order: 60,
  },
  {
    slug: "ostalo",
    name: "Ostalo",
    description: "Sve što ne spada u prethodne kategorije.",
    sort_order: 99,
  },
];

/* ------------------------------------------------------------------ */
/* Type guards — used to validate untrusted searchParams               */
/* ------------------------------------------------------------------ */

export function isListingCondition(v: unknown): v is ListingCondition {
  return typeof v === "string" && (LISTING_CONDITIONS as readonly string[]).includes(v);
}

export function isListingStatus(v: unknown): v is ListingStatus {
  return typeof v === "string" && (LISTING_STATUSES as readonly string[]).includes(v);
}

export function isSortOption(v: unknown): v is SortOption {
  return typeof v === "string" && (SORT_OPTIONS as readonly string[]).includes(v);
}

export function isUserRole(v: unknown): v is UserRole {
  return typeof v === "string" && (USER_ROLES as readonly string[]).includes(v);
}
