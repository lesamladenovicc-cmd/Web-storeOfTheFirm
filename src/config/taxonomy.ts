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
/* Purpose — sale or rent (migration 0013)                             */
/* ------------------------------------------------------------------ */

/**
 * What the unit is offered FOR. An axis of its own: orthogonal to
 * `condition` (how far the building has got) and to `status` (whether
 * it is still in the offer).
 *
 * `price_eur` carries a one-off asking price for `prodaja` and a
 * MONTHLY rent for `izdavanje` — the "/mesec" suffix is presentation
 * and lives in lib/format.ts, never in the database.
 */
export const LISTING_PURPOSES = ["prodaja", "izdavanje"] as const;

export type ListingPurpose = (typeof LISTING_PURPOSES)[number];

export const PURPOSE_LABELS: Record<ListingPurpose, string> = {
  prodaja: "Prodaja",
  izdavanje: "Izdavanje",
};

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

/**
 * `prodato` IS THE TERMINAL STATE FOR BOTH PURPOSES — it means "left
 * the offer", not literally "sold". A rented-out unit is stored as
 * `status = 'prodato', purpose = 'izdavanje'` and reads "Izdato".
 *
 * There is no separate `izdato` enum value on purpose: the pair
 * ('aktivan','prodato') is hardcoded in two RLS policies, three publish
 * CHECK constraints, four partial indexes and the search RPC, and a
 * third value missed in any one of them would 404 every rented unit.
 * See migration 0013 for the full argument. Use `soldLabel()` for the
 * user-facing word; never render `STATUS_LABELS.prodato` on the public
 * site.
 */
export const LISTING_STATUSES = ["nacrt", "aktivan", "prodato"] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Dashboard-only. The public site derives its wording from `soldLabel`. */
export const STATUS_LABELS: Record<ListingStatus, string> = {
  nacrt: "Nacrt",
  aktivan: "Aktivan",
  prodato: "Prodato / Izdato",
};

/** Only `aktivan` listings are publicly visible and indexable. */
export const PUBLIC_STATUS: ListingStatus = "aktivan";

/** The ribbon over the cover image, and the notice on the listing page. */
export function soldLabel(purpose: ListingPurpose): string {
  return purpose === "izdavanje" ? "Izdato" : "Prodato";
}

/**
 * schema.org availability.
 *
 * A rented unit is `OutOfStock`, not `SoldOut`: SoldOut asserts a sale
 * that did not happen, and the unit returns to the market when the
 * lease ends.
 */
export function availabilityFor(status: ListingStatus, purpose: ListingPurpose): string {
  if (status === "aktivan") return "https://schema.org/InStock";
  if (status === "prodato") {
    return purpose === "izdavanje"
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/SoldOut";
  }
  return "https://schema.org/OutOfStock";
}

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

export function isListingPurpose(v: unknown): v is ListingPurpose {
  return typeof v === "string" && (LISTING_PURPOSES as readonly string[]).includes(v);
}

export function isSortOption(v: unknown): v is SortOption {
  return typeof v === "string" && (SORT_OPTIONS as readonly string[]).includes(v);
}

export function isUserRole(v: unknown): v is UserRole {
  return typeof v === "string" && (USER_ROLES as readonly string[]).includes(v);
}
