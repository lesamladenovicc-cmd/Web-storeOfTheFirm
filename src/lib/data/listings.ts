import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { LIMITS } from "@/config/site";
import { DEFAULT_SORT, type ListingCondition, type ListingStatus } from "@/config/taxonomy";
import type {
  Listing,
  ListingCard,
  ListingFilters,
  ListingImage,
  ListingRow,
  Paginated,
} from "@/types/domain";

/**
 * DATA / LISTINGS — the only module that knows the wire format.
 *
 * Public reads use the session-less anon client (see supabase/public.ts):
 * it keeps public routes statically generatable and guarantees they can
 * only ever see active rows. Dashboard reads use the cookie client,
 * which carries the session RLS needs to scope them to the owner.
 */

/* ------------------------------------------------------------------ */
/* Row shapes                                                          */
/* ------------------------------------------------------------------ */

type SearchRow = {
  id: string;
  slug: string;
  title: string;
  condition: ListingCondition;
  price_rsd: number | null;
  is_negotiable: boolean;
  status: ListingStatus;
  location: string;
  cover_image_path: string | null;
  category_name: string | null;
  category_slug: string | null;
  published_at: string | null;
  updated_at: string;
  total_count: number;
};

function toCard(row: SearchRow): ListingCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    condition: row.condition,
    priceRsd: row.price_rsd,
    isNegotiable: row.is_negotiable,
    status: row.status,
    location: row.location,
    coverImagePath: row.cover_image_path,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

type SearchArgs = {
  p_query: string | null;
  p_category_slug: string | null;
  p_conditions: ListingCondition[] | null;
  p_price_min: number | null;
  p_price_max: number | null;
  p_location: string | null;
  p_sort: string;
  p_limit: number;
  p_offset: number;
};

function searchArgs(overrides: Partial<SearchArgs>): SearchArgs {
  return {
    p_query: null,
    p_category_slug: null,
    p_conditions: null,
    p_price_min: null,
    p_price_max: null,
    p_location: null,
    p_sort: DEFAULT_SORT,
    p_limit: LIMITS.pageSize,
    p_offset: 0,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* Public reads                                                        */
/* ------------------------------------------------------------------ */

/**
 * Search + filter + sort + paginate in one round trip. The RPC returns
 * the total row count as a window function, so there is no second
 * COUNT query.
 */
export async function searchListings(
  filters: ListingFilters = {},
): Promise<Paginated<ListingCard>> {
  const supabase = createPublicClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = LIMITS.pageSize;

  const { data, error } = await supabase.rpc(
    "search_listings",
    searchArgs({
      p_query: filters.q ?? null,
      p_category_slug: filters.categorySlug ?? null,
      p_conditions: filters.conditions?.length ? filters.conditions : null,
      p_price_min: filters.priceMin ?? null,
      p_price_max: filters.priceMax ?? null,
      p_location: filters.location ?? null,
      p_sort: filters.sort ?? DEFAULT_SORT,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    }),
  );

  if (error) throw new Error(`searchListings: ${error.message}`);

  const rows = (data ?? []) as SearchRow[];
  const total = Number(rows[0]?.total_count ?? 0);

  return {
    items: rows.map(toCard),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Newest active listings — homepage strip. */
export const getLatestListings = cache(
  async (limit = LIMITS.homepageListings): Promise<ListingCard[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("search_listings", searchArgs({ p_limit: limit }));

    if (error) throw new Error(`getLatestListings: ${error.message}`);
    return ((data ?? []) as SearchRow[]).map(toCard);
  },
);

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

type ImageRow = {
  id: string;
  listing_id: string;
  storage_path: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
};

type DetailRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  condition: ListingCondition;
  price_rsd: number | null;
  is_negotiable: boolean;
  status: ListingStatus;
  location: string;
  category_id: string | null;
  seller_id: string;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  cover_image_path: string | null;
  attributes: Record<string, unknown> | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  categories: { name: string; slug: string } | null;
  listing_images: ImageRow[] | null;
};

const DETAIL_SELECT =
  "id, slug, title, description, condition, price_rsd, is_negotiable, status, " +
  "location, category_id, seller_id, contact_name, contact_phone, contact_email, " +
  "cover_image_path, attributes, view_count, published_at, created_at, updated_at, " +
  "categories ( name, slug ), " +
  "listing_images ( id, listing_id, storage_path, alt, width, height, sort_order )";

function toListing(row: DetailRow): Listing {
  const images: ListingImage[] = (row.listing_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({
      id: img.id,
      listingId: img.listing_id,
      storagePath: img.storage_path,
      alt: img.alt,
      width: img.width,
      height: img.height,
      sortOrder: img.sort_order,
    }));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    condition: row.condition,
    priceRsd: row.price_rsd,
    isNegotiable: row.is_negotiable,
    status: row.status,
    location: row.location,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    categorySlug: row.categories?.slug ?? null,
    sellerId: row.seller_id,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    coverImagePath: row.cover_image_path ?? images[0]?.storagePath ?? null,
    attributes: row.attributes ?? {},
    viewCount: row.view_count,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images,
  };
}

/**
 * Listing by slug. Returns null both when the row is missing and when
 * RLS hides it, so an unpublished listing 404s exactly like a
 * non-existent one — its existence is never confirmed.
 */
export const getListingBySlug = cache(async (slug: string): Promise<Listing | null> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return toListing(data as unknown as DetailRow);
});

/** Listing by id — dashboard edit screen. RLS scopes it to owner/admin. */
export const getListingById = cache(async (id: string): Promise<Listing | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return toListing(data as unknown as DetailRow);
});

/** Same-category listings, excluding the one being viewed. */
export async function getRelatedListings(
  categorySlug: string | null,
  excludeId: string,
  limit = LIMITS.relatedListings,
): Promise<ListingCard[]> {
  if (!categorySlug) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc(
    "search_listings",
    searchArgs({ p_category_slug: categorySlug, p_limit: limit + 1 }),
  );

  if (error) return [];
  return ((data ?? []) as SearchRow[])
    .map(toCard)
    .filter((l) => l.id !== excludeId)
    .slice(0, limit);
}

/**
 * View counter.
 *
 * MUST NOT be called from the page body: /oglas/[slug] is an ISR page,
 * so its body runs only when the cache regenerates (once an hour), not
 * once per visitor, so counting there would undercount by orders of
 * magnitude. It is invoked from a client effect instead, via the
 * trackViewAction server action.
 *
 * Uses the anon client: increment_view_count is SECURITY DEFINER and
 * only ever touches view_count on one active row.
 */
export async function incrementViewCount(listingId: string): Promise<void> {
  try {
    const supabase = createPublicClient();
    await supabase.rpc("increment_view_count", { p_listing_id: listingId });
  } catch {
    // Intentionally swallowed.
  }
}

/* ------------------------------------------------------------------ */
/* Sitemap / static params                                             */
/* ------------------------------------------------------------------ */

/**
 * Only slug + updated_at — the sitemap needs nothing else.
 *
 * Uses the session-less client: sitemap() and generateStaticParams()
 * run at build time where there is no cookie store.
 */
export async function getListingsForSitemap(): Promise<{ slug: string; updatedAt: string }[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select("slug, updated_at")
    .eq("status", "aktivan")
    .order("published_at", { ascending: false })
    .limit(45000);

  if (error || !data) return [];
  return (data as { slug: string; updated_at: string }[]).map((r) => ({
    slug: r.slug,
    updatedAt: r.updated_at,
  }));
}

export async function getActiveListingSlugs(limit = 1000): Promise<string[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select("slug")
    .eq("status", "aktivan")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as { slug: string }[]).map((r) => r.slug);
}

/* ------------------------------------------------------------------ */
/* Dashboard reads                                                     */
/* ------------------------------------------------------------------ */

type DashboardRow = {
  id: string;
  slug: string;
  title: string;
  condition: ListingCondition;
  price_rsd: number | null;
  is_negotiable: boolean;
  status: ListingStatus;
  location: string;
  cover_image_path: string | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  view_count: number;
  seller_id: string;
  categories: { name: string; slug: string } | null;
  profiles: { full_name: string } | null;
};

const DASHBOARD_SELECT =
  "id, slug, title, condition, price_rsd, is_negotiable, status, location, " +
  "cover_image_path, published_at, updated_at, created_at, view_count, seller_id, " +
  "categories ( name, slug ), profiles ( full_name )";

/**
 * Dashboard table rows. Deliberately does NOT filter by seller: RLS
 * already restricts a seller to their own listings and lets an admin
 * see all of them, so the policy is the filter.
 */
export async function getDashboardListings(status?: ListingStatus): Promise<ListingRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select(DASHBOARD_SELECT)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(`getDashboardListings: ${error.message}`);

  return ((data ?? []) as unknown as DashboardRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    condition: row.condition,
    priceRsd: row.price_rsd,
    isNegotiable: row.is_negotiable,
    status: row.status,
    location: row.location,
    coverImagePath: row.cover_image_path,
    categoryName: row.categories?.name ?? null,
    categorySlug: row.categories?.slug ?? null,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    sellerId: row.seller_id,
    sellerName: row.profiles?.full_name ?? null,
    viewCount: row.view_count,
  }));
}

export type DashboardStats = {
  total: number;
  aktivan: number;
  nacrt: number;
  prodato: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").select("status");

  const stats: DashboardStats = { total: 0, aktivan: 0, nacrt: 0, prodato: 0 };
  if (error || !data) return stats;

  stats.total = data.length;
  for (const row of data as { status: ListingStatus }[]) {
    stats[row.status] += 1;
  }
  return stats;
}
