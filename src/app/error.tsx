"use client";

import { useEffect } from "react";
import { COPY } from "@/config/copy";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

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
        <Eyebrow className="justify-center">Greška</Eyebrow>
        <h1 className="text-h1 text-fg mt-4">{COPY.states.errorTitle}</h1>
        <p className="text-fg-muted mx-auto mt-3 max-w-md">{COPY.states.errorBody}</p>
        <Button onClick={reset} size="lg" className="mt-8">
          {COPY.states.errorRetry}
        </Button>
        {error.digest ? (
          <p className="u-numeric text-fg-faint mt-6 text-xs">Ref: {error.digest}</p>
        ) : null}
      </Container>
    </main>
  );
}
