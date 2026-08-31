"use client";

import { useEffect } from "react";
import { COPY } from "@/config/copy";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";

/**
 * Global error boundary. Never renders the error message or stack —
 * those can carry query fragments or internal identifiers.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center">
      <Container className="text-center">
        <p className="u-eyebrow text-accent">Greška</p>
        <h1 className="mt-4 text-h1 text-paper">{COPY.states.errorTitle}</h1>
        <p className="mx-auto mt-3 max-w-md text-paper-muted">{COPY.states.errorBody}</p>
        <Button onClick={reset} size="lg" className="mt-8">
          {COPY.states.errorRetry}
        </Button>
        {error.digest ? (
          <p className="u-numeric mt-6 text-xs text-paper-faint">Ref: {error.digest}</p>
        ) : null}
      </Container>
    </main>
  );
}
