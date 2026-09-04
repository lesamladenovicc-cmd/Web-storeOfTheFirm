import type { JsonLdObject } from "@/lib/seo";

/**
 * Renders a JSON-LD block.
 *
 * `<` is escaped to `<` so that listing text containing "</script>"
 * cannot break out of the script element. JSON.stringify alone does not
 * protect against this.
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
