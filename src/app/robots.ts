import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Filtered /oglasi URLs are deliberately NOT disallowed here.
 *
 * A blocked URL is never fetched, so its `noindex` is never seen, and
 * Google may still index the URL from inbound links — with no snippet.
 * Crawl-allow plus meta-noindex (see lib/filters.ts) is the correct
 * pairing for faceted navigation.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/prijava", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
