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
/**
 * Crawlers we want to be READ by, named explicitly.
 *
 * They already fall under `*: allow /`, so this changes no permission.
 * It is here because these agents are the ones people now ask about
 * property, and several of their operators document per-agent rules —
 * an explicit `Allow` states the intent so a later blanket tightening of
 * the `*` rule cannot silently lock them out.
 *
 * Split by job, because they are not the same decision:
 *  - the SEARCH agents fetch a page to answer a question and cite it;
 *  - the TRAINING agents collect corpus text.
 * Both are allowed today. If the client ever wants out of model
 * training, remove the second list and nothing about answer-engine
 * visibility changes.
 */
const AI_SEARCH_AGENTS = ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-User"];
const AI_TRAINING_AGENTS = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot"];

const DISALLOW = ["/dashboard/", "/prijava", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
      {
        userAgent: [...AI_SEARCH_AGENTS, ...AI_TRAINING_AGENTS],
        // llms.txt and ponuda.json are the two URLs written for these
        // agents specifically; everything public stays open besides.
        allow: ["/", "/llms.txt", "/ponuda.json"],
        disallow: DISALLOW,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
