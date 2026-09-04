"use client";

import { useState } from "react";
import { COPY } from "@/config/copy";

/**
 * Web Share API where available (mobile), clipboard fallback elsewhere.
 * Uses window.location so it never needs the absolute URL passed in.
 */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User dismissed the sheet — fall through to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; nothing useful left to try.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="border-line-strong text-fg-muted hover:border-fg hover:text-fg inline-flex h-10 items-center gap-2 border px-4 font-[family-name:var(--font-ui)] text-[0.6875rem] font-semibold tracking-[0.12em] uppercase transition-colors duration-200"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <circle cx="12" cy="3.5" r="2" />
        <circle cx="4" cy="8" r="2" />
        <circle cx="12" cy="12.5" r="2" />
        <path d="m5.8 7 4.4-2.5M5.8 9l4.4 2.5" />
      </svg>
      {copied ? COPY.listing.shareCopied : COPY.listing.share}
    </button>
  );
}
