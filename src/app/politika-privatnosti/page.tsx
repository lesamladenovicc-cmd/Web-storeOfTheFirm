import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { ProsePage } from "@/components/layout/ProsePage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: COPY.pages.privacy.title,
  path: "/politika-privatnosti",
});

export default function PrivacyPage() {
  return (
    <ProsePage
      title={COPY.pages.privacy.title}
      paragraphs={COPY.pages.privacy.body}
    />
  );
}
