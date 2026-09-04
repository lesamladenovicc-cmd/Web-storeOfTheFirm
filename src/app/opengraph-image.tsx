import { ImageResponse } from "next/og";
import { SITE } from "@/config/site";

export const alt = SITE.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
        background: "#141414",
        padding: 72,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            border: "3px solid #BF3F0C",
            color: "#EC6D3E",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          {SITE.name.charAt(0)}
        </div>
        <div
          style={{
            color: "#F4EFE3",
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
            color: "#F4EFE3",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: -2.5,
          }}
        >
          Polovna i nova oprema
        </div>
        <div style={{ color: "#A8A296", fontSize: 32, marginTop: 20 }}>
          Bez posrednika. Direktan kontakt sa prodavcem.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 12, height: 12, background: "#BF3F0C" }} />
        <div style={{ color: "#9A9386", fontSize: 22, letterSpacing: 4 }}>SR-RS / RSD</div>
      </div>
    </div>,
    size,
  );
}
