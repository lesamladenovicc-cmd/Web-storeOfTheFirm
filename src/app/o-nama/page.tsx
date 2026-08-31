import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { ProsePage } from "@/components/layout/ProsePage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: COPY.pages.about.title,
  description: COPY.pages.about.lead,
  path: "/o-nama",
});

export default function AboutPage() {
  return (
    <ProsePage
      eyebrow={COPY.home.heroEyebrow}
      title={COPY.pages.about.title}
      lead={COPY.pages.about.lead}
      paragraphs={COPY.pages.about.body}
    />
  );
}
