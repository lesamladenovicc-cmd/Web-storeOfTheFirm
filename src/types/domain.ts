/**
 * DOMAIN — application-facing shapes.
 *
 * Hand-written rather than derived from `database.ts` so that the UI is
 * insulated from column churn, and so the codebase compiles before the
 * Supabase project exists. `database.ts` (generated) is the source of
 * truth for the wire format; the mappers in `lib/data/*` bridge the two.
 */

import type {
  ListingCondition,
  ListingPurpose,
  ListingStatus,
  UserRole,
} from "@/config/taxonomy";

export type { ListingCondition, ListingPurpose, ListingStatus, UserRole };

/* ------------------------------------------------------------------ */

export type Profile = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  location: string | null;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

/** Category plus the number of publicly visible listings inside it. */
export type CategoryWithCount = Category & {
  listingCount: number;
};

export type ListingImage = {
  id: string;
  listingId: string;
  storagePath: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
};

/**
 * Slim shape used by grids and the sitemap. Deliberately excludes
 * `description` and the image array — a 24-card grid should not ship
 * 24 full descriptions to the client.
 */
export type ListingCard = {
  id: string;
  slug: string;
  title: string;
  /** Null only on drafts; publishing requires it. */
  condition: ListingCondition | null;
  /** Sale or rent. Decides how `priceEur` is read and labelled. */
  purpose: ListingPurpose;
  /** A one-off asking price for `prodaja`, a MONTHLY rent for `izdavanje`. */
  priceEur: number | null;
  isNegotiable: boolean;
  status: ListingStatus;
  location: string;
  coverImagePath: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

/**
 * Property specification, stored in `listings.attributes` (jsonb).
 *
 * The column was in the schema from the start as a niche escape hatch
 * and went unused by the machine-listing MVP; this is what it now holds.
 * It stays jsonb rather than becoming columns because the fields differ
 * per property type — a garage has no `brojSoba`, a plot has no `sprat`
 * — and because a new field must not mean a migration.
 *
 * EVERY FIELD IS OPTIONAL. A draft may be half-finished, and a genuinely
 * unknown value must be absent rather than zero: `kvadratura: 0` would
 * render as "0 m²" and, worse, reach `floorSize` in the JSON-LD.
 */
export type ListingAttributes = {
  /** Interior area in m². Drives floorSize and the price-per-m² figure. */
  kvadratura?: number;
  /** Serbian half-rooms are real: 2.5 means "dvoiposoban". */
  brojSoba?: number;
  /** Free text because "PR", "VPR" and "4/8" are all valid answers. */
  sprat?: string;
  brojKupatila?: number;
  grejanje?: string;
  orijentacija?: string;
  terasaM2?: number;
  lift?: boolean;
  garaznoMesto?: boolean;
  uknjizen?: boolean;
  /** Free text: "Q3 2026", "odmah", "po tehničkom prijemu". */
  rokUseljenja?: string;
  energetskiRazred?: string;
};

/** Full listing as rendered on the public detail page. */
export type Listing = ListingCard & {
  description: string;
  categoryId: string | null;
  sellerId: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  attributes: ListingAttributes;
  viewCount: number;
  createdAt: string;
  images: ListingImage[];
};

/** Dashboard row — adds owner info for the admin's all-listings view. */
export type ListingRow = ListingCard & {
  sellerId: string;
  sellerName: string | null;
  viewCount: number;
  createdAt: string;
};

export type Inquiry = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  listingSlug: string | null;
  sellerId: string;
  senderName: string;
  senderPhone: string | null;
  senderEmail: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/* Query inputs                                                        */
/* ------------------------------------------------------------------ */

export type ListingFilters = {
  q?: string;
  categorySlug?: string;
  purpose?: ListingPurpose;
  conditions?: ListingCondition[];
  priceMin?: number;
  priceMax?: number;
  location?: string;
  sort?: string;
  page?: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/* ------------------------------------------------------------------ */
/* Server Action results                                               */
/* ------------------------------------------------------------------ */

/**
 * Uniform shape returned by every Server Action, consumed by
 * `useActionState`. Field errors are keyed by form field name.
 */
export type ActionState<T = undefined> = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
};

/**
 * Initial state for useActionState.
 *
 * Deliberately NOT annotated as `ActionState` (i.e. ActionState<undefined>):
 * that would pin `data` to undefined and make it unusable as the initial
 * state of a typed action such as ActionState<{ password: string }>.
 * `data` is optional, so this literal satisfies ActionState<T> for every T.
 */
export const ACTION_IDLE = { ok: false } as const;
