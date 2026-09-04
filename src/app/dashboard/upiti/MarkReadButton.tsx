"use client";

import { useTransition } from "react";
import { COPY } from "@/config/copy";
import { markInquiryReadAction } from "./actions";

export function MarkReadButton({ inquiryId }: { inquiryId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void markInquiryReadAction(inquiryId))}
      className="text-fg-faint hover:text-accent-text text-xs underline-offset-4 transition-colors hover:underline disabled:opacity-50"
    >
      {COPY.dashboard.inquiries.markRead}
    </button>
  );
}
