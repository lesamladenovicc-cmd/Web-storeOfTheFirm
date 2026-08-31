import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Category, CategoryWithCount } from "@/types/domain";

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

/** Active categories with their live listing counts — homepage tiles. */
export const getCategoriesWithCounts = cache(async (): Promise<CategoryWithCount[]> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("category_counts");

  if (error || !data) return [];

  return (data as (CategoryRow & { listing_count: number })[]).map((row) => ({
    ...toCategory(row),
    listingCount: Number(row.listing_count),
  }));
});

/** Active categories only — used by public filters. */
export const getActiveCategories = cache(async (): Promise<Category[]> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];
  return (data as CategoryRow[]).map(toCategory);
});

/**
 * All categories including inactive ones — the dashboard form must be
 * able to render the category of an existing listing even after an
 * admin deactivates it, otherwise the field silently renders blank.
 */
export const getAllCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];
  return (data as CategoryRow[]).map(toCategory);
});

export const getCategoryBySlug = cache(async (slug: string): Promise<Category | null> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, sort_order, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return toCategory(data as CategoryRow);
});

/**
 * Slugs for generateStaticParams on /kategorija/[slug].
 *
 * Deliberately does NOT reuse getActiveCategories(): that one uses the
 * cookie-based client, which is unavailable at build time.
 */
export async function getActiveCategorySlugs(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return (data as { slug: string }[]).map((c) => c.slug);
}

/** Admin view: categories plus counts, including inactive ones. */
export async function getCategoriesForAdmin(): Promise<CategoryWithCount[]> {
  const supabase = await createClient();

  const [{ data: cats }, { data: counts }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, description, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    supabase.from("listings").select("category_id"),
  ]);

  if (!cats) return [];

  const tally = new Map<string, number>();
  for (const row of (counts ?? []) as { category_id: string | null }[]) {
    if (!row.category_id) continue;
    tally.set(row.category_id, (tally.get(row.category_id) ?? 0) + 1);
  }

  return (cats as CategoryRow[]).map((row) => ({
    ...toCategory(row),
    listingCount: tally.get(row.id) ?? 0,
  }));
}
