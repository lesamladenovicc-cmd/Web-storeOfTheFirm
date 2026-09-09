import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE } from "@/config/site";

export const alt = SITE.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The emblem, read once at module scope: this card has no request data,
 * so it is rendered at build time and the file is never read per hit.
 * Path is relative to the project root, as next/og documents.
 */
const emblem = await readFile(join(process.cwd(), "src/assets/brand/logo-badge.png"), "base64");
const emblemSrc = `data:image/png;base64,${emblem}`;

/**
 * Site-level OG card.
 *
 * DELIBERATELY ASCII-ONLY. next/og has no system fonts — it renders with
 * a bundled default that does not cover Serbian diacritics (č ć š ž đ),
 * and fetching a webfont at render time means depending on a Google
 * Fonts URL that rotates without notice. Keeping this card free of
 * diacritics sidesteps both problems.
 *
 * That constraint costs nothing in practice: publishing a listing
 * requires at least one photo, so every indexable listing supplies its
 * own real OG image and this card is only the fallback.
 *
 * Colours mirror the dark ground tokens in globals.css; next/og cannot
 * read CSS variables, so they are repeated here on purpose.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#1b212b",
        padding: 72,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain elements */}
        <img src={emblemSrc} width={96} height={96} alt="" />
        <div
          style={{
            color: "#f3f1ec",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          {SITE.name}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: "#f3f1ec",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: -2.5,
          }}
        >
          Polovna i nova oprema
        </div>
        <div style={{ color: "#b6bbc4", fontSize: 32, marginTop: 20 }}>
          Bez posrednika. Direktan kontakt sa prodavcem.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 12, height: 12, background: "#ffbf2e" }} />
        <div style={{ color: "#aab0ba", fontSize: 22, letterSpacing: 4 }}>SR-RS / RSD</div>
      </div>
    </div>,
    size,
  );
}
