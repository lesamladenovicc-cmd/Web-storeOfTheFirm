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
/* Build phase (column is still `condition` — see migration 0011)      */
/* ------------------------------------------------------------------ */

/**
 * ORDER MATTERS AND IS DEFINED HERE, NOT IN POSTGRES.
 *
 * Migration 0011 renamed the four enum values in place, which leaves
 * their original creation order behind: Postgres still sorts them
 * `useljivo < pred_useljenje < u_izgradnji < u_pripremi`. This array is
 * the chronological truth and drives every picker and filter, so no
 * query may `order by condition`.
 */
export const LISTING_CONDITIONS = [
  "u_pripremi",
  "u_izgradnji",
  "pred_useljenje",
  "useljivo",
] as const;

export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  u_pripremi: "U pripremi",
  u_izgradnji: "U izgradnji",
  pred_useljenje: "Pred useljenje",
  useljivo: "Useljivo",
};

/** Short helper text shown under the phase picker in the dashboard. */
export const CONDITION_HINTS: Record<ListingCondition, string> = {
  u_pripremi: "Projekat u pripremi. Ugovaranje po sistemu rezervacije, pre početka radova.",
  u_izgradnji: "Objekat je u gradnji. Kupovina u ranoj fazi, po povoljnijoj ceni.",
  pred_useljenje: "Radovi su u završnoj fazi. Useljenje u roku od nekoliko meseci.",
  useljivo: "Objekat je završen i tehnički primljen. Useljenje odmah.",
};

/**
 * schema.org OfferItemCondition used by the Product node.
 *
 * All four map to NewCondition, and that is not laziness: every unit we
 * list is new-build, so wear is genuinely constant. The axis that varies
 * — how far the building has got — has no OfferItemCondition that means
 * it, and forcing it into one would be a false claim about the property.
 * It is emitted as a PropertyValue in `additionalProperty` instead.
 */
export const CONDITION_SCHEMA_URL: Record<ListingCondition, string> = {
  u_pripremi: "https://schema.org/NewCondition",
  u_izgradnji: "https://schema.org/NewCondition",
  pred_useljenje: "https://schema.org/NewCondition",
  useljivo: "https://schema.org/NewCondition",
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
    slug: "stanovi",
    name: "Stanovi",
    description:
      "Garsonjere, jednosobni i višesobni stanovi u zgradama koje BG Building gradi u Beogradu.",
    sort_order: 10,
  },
  {
    slug: "lokali",
    name: "Lokali",
    description:
      "Ulični lokali u prizemlju novogradnje, sa izlogom i sopstvenim ulazom.",
    sort_order: 20,
  },
  {
    slug: "poslovni-prostor",
    name: "Poslovni prostor",
    description: "Kancelarije i poslovne jedinice na višim etažama naših objekata.",
    sort_order: 30,
  },
  {
    slug: "garaze-i-parking",
    name: "Garaže i parking",
    description: "Garažna i parking mesta u podzemnim etažama, uz stanove ili zasebno.",
    sort_order: 40,
  },
  {
    slug: "kuce",
    name: "Kuće",
    description: "Samostojeći objekti i kuće u nizu iz naše gradnje.",
    sort_order: 50,
  },
  {
    slug: "ostalo",
    name: "Ostalo",
    description: "Ostave, magacinski prostor i ostale jedinice u objektima.",
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
