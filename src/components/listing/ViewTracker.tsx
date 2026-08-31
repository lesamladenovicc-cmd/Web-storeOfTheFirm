"use client";

import { useEffect, useRef } from "react";
import { trackViewAction } from "@/app/oglas/[slug]/actions";

/**
 * Counts a view from the client.
 *
 * The detail page is ISR-cached, so its server body runs only on cache
 * regeneration — incrementing there would count roughly once per hour
 * instead of once per visitor. A client effect fires once per actual
 * page view, which is what the number is supposed to mean.
 *
 * The ref guards against React 18/19 StrictMode double-invocation in
 * development, which would otherwise double every count locally.
 */
export function ViewTracker({ listingId }: { listingId: string }) {
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    void trackViewAction(listingId);
  }, [listingId]);

  return null;
}
