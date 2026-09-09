import Link from "next/link";
import { COPY } from "@/config/copy";
import { PageHeader } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { requireProfile } from "@/lib/auth";
import { getInquiries } from "@/lib/data/inquiries";
import { formatDateTime, formatPhone } from "@/lib/format";
import { cn } from "@/lib/cn";
import { MarkReadButton } from "./MarkReadButton";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  await requireProfile();
  const inquiries = await getInquiries();

  return (
    <>
      <PageHeader eyebrow={COPY.dashboard.title} title={COPY.dashboard.inquiries.title} />

      <div className="mt-8">
        {inquiries.length === 0 ? (
          <EmptyState
            title={COPY.dashboard.inquiries.empty}
            body={COPY.dashboard.inquiries.emptyBody}
          />
        ) : (
          <ul className="space-y-4">
            {inquiries.map((inquiry) => (
              <li
                key={inquiry.id}
                className={cn(
                  "bg-panel rounded-md border p-5",
                  inquiry.isRead ? "border-line" : "border-signal",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="font-display text-fg font-semibold">{inquiry.senderName}</p>
                      {!inquiry.isRead ? (
                        <Badge tone="accent">{COPY.dashboard.inquiries.unread}</Badge>
                      ) : null}
                    </div>

                    <p className="u-numeric text-fg-faint mt-1 text-xs">
                      {COPY.dashboard.inquiries.received} {formatDateTime(inquiry.createdAt)}
                    </p>
                  </div>

                  {!inquiry.isRead ? <MarkReadButton inquiryId={inquiry.id} /> : null}
                </div>

                {inquiry.listingTitle && inquiry.listingSlug ? (
                  <p className="text-fg-muted mt-3 text-sm">
                    {COPY.dashboard.inquiries.forListing}:{" "}
                    <Link
                      href={`/oglas/${inquiry.listingSlug}`}
                      className="text-fg hover:text-accent-text transition-colors"
                    >
                      {inquiry.listingTitle}
                    </Link>
                  </p>
                ) : null}

                <p className="border-signal text-fg-muted mt-4 border-l-2 pl-4 text-[0.9375rem] leading-relaxed whitespace-pre-line">
                  {inquiry.message}
                </p>

                <div className="u-numeric border-line mt-4 flex flex-wrap gap-x-6 gap-y-1.5 border-t pt-4 text-sm">
                  {inquiry.senderPhone ? (
                    <a
                      href={`tel:${inquiry.senderPhone}`}
                      className="text-fg hover:text-accent-text transition-colors"
                    >
                      {formatPhone(inquiry.senderPhone)}
                    </a>
                  ) : null}
                  {inquiry.senderEmail ? (
                    <a
                      href={`mailto:${inquiry.senderEmail}`}
                      className="text-fg hover:text-accent-text transition-colors"
                    >
                      {inquiry.senderEmail}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
