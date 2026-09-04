"use client";

import { Archivo, IBM_Plex_Sans } from "next/font/google";

const archivo = Archivo({ subsets: ["latin", "latin-ext"], weight: ["700"] });
const plex = IBM_Plex_Sans({ subsets: ["latin", "latin-ext"], weight: ["400"] });

/**
 * Last-resort boundary for errors thrown in the root layout itself.
 *
 * It REPLACES the root layout, so it must render its own <html>/<body>
 * and cannot rely on globals.css, the theme tokens or the font
 * variables — hence the inline styles and the direct font import.
 *
 * Serbian, and no error details: a digest is enough to correlate with
 * server logs without leaking internals to the visitor.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sr-RS">
      <body
        className={plex.className}
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#141414",
          color: "#F4EFE3",
          padding: "24px",
        }}
      >
        <main style={{ textAlign: "center", maxWidth: "32rem" }}>
          <p
            style={{
              margin: 0,
              color: "#EC6D3E",
              fontSize: "0.6875rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Greška
          </p>
          <h1
            className={archivo.className}
            style={{ margin: "16px 0 0", fontSize: "2rem", lineHeight: 1.1 }}
          >
            Došlo je do greške
          </h1>
          <p style={{ margin: "12px 0 0", color: "#A8A296", lineHeight: 1.6 }}>
            Pokušajte ponovo. Ako se problem ponovi, javite nam se.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "32px",
              height: "48px",
              padding: "0 28px",
              border: "none",
              borderRadius: 0,
              background: "#BF3F0C",
              color: "#FBF7EE",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Pokušaj ponovo
          </button>
          {error.digest ? (
            <p style={{ marginTop: "24px", fontSize: "0.75rem", color: "#9A9386" }}>
              Ref: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
