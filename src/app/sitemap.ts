import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getActiveCategories } from "@/lib/data/categories";
import { getListingsForSitemap } from "@/lib/data/listings";

/**
 * Only indexable URLs belong here. Drafts, sold listings, /prijava and
 * every /dashboard route are excluded — listing a noindex URL wastes
 * crawl budget and muddles Search Console coverage reports.
 *
 * Note: a sitemap index is required past 50k URLs. The listing query is
 * capped at 45k, which is far beyond MVP volume but keeps the file
 * valid rather than silently truncated.
 */
export const revalidate = 3600; // See the ISR POLICY table in @/config/site.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, listings] = await Promise.all([
    getActiveCategories(),
    getListingsForSitemap(),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/oglasi"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/o-nama"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/kontakt"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    {
      url: absoluteUrl("/uslovi-koriscenja"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: absoluteUrl("/politika-privatnosti"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: absoluteUrl(`/kategorija/${c.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: absoluteUrl(`/oglas/${l.slug}`),
    lastModified: new Date(l.updatedAt),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...listingRoutes];
}
