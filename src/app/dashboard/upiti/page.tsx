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
      <PageHeader
        eyebrow={COPY.dashboard.title}
        title={COPY.dashboard.inquiries.title}
      />

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
                  "rounded-md border bg-surface p-5",
                  inquiry.isRead ? "border-border" : "border-accent/40",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="font-display font-semibold text-paper">
                        {inquiry.senderName}
                      </p>
                      {!inquiry.isRead ? (
                        <Badge tone="accent">{COPY.dashboard.inquiries.unread}</Badge>
                      ) : null}
                    </div>

                    <p className="u-numeric mt-1 text-xs text-paper-faint">
                      {COPY.dashboard.inquiries.received}{" "}
                      {formatDateTime(inquiry.createdAt)}
                    </p>
                  </div>

                  {!inquiry.isRead ? <MarkReadButton inquiryId={inquiry.id} /> : null}
                </div>

                {inquiry.listingTitle && inquiry.listingSlug ? (
                  <p className="mt-3 text-sm text-paper-muted">
                    {COPY.dashboard.inquiries.forListing}:{" "}
                    <Link
                      href={`/oglas/${inquiry.listingSlug}`}
                      className="text-paper transition-colors hover:text-accent"
                    >
                      {inquiry.listingTitle}
                    </Link>
                  </p>
                ) : null}

                <p className="mt-4 border-l-2 border-accent pl-4 text-[0.9375rem] leading-relaxed whitespace-pre-line text-paper-muted">
                  {inquiry.message}
                </p>

                <div className="u-numeric mt-4 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-border pt-4 text-sm">
                  {inquiry.senderPhone ? (
                    <a
                      href={`tel:${inquiry.senderPhone}`}
                      className="text-paper transition-colors hover:text-accent"
                    >
                      {formatPhone(inquiry.senderPhone)}
                    </a>
                  ) : null}
                  {inquiry.senderEmail ? (
                    <a
                      href={`mailto:${inquiry.senderEmail}`}
                      className="text-paper transition-colors hover:text-accent"
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
