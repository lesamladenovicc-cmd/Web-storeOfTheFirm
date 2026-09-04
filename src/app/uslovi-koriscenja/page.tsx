import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { ProsePage } from "@/components/layout/ProsePage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: COPY.pages.terms.title,
  path: "/uslovi-koriscenja",
});

export default function TermsPage() {
  return <ProsePage title={COPY.pages.terms.title} paragraphs={COPY.pages.terms.body} />;
}
