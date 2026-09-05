/**
 * Brand asset generator — `npm run brand:logo`.
 *
 * Cuts the BG Building emblem out of the supplied JPEG and writes every
 * variant the app needs. Re-run whenever the source in `Slike/` changes.
 *
 *   src/assets/brand/logo-badge.png   800px, transparent outside the
 *                                     emblem's circle — header, footer,
 *                                     login, OG card
 *   src/app/icon.png                  256px, same — favicon
 *   src/app/apple-icon.png            180px on white — iOS ignores alpha
 *   public/logo.png                   512px on white — Organization JSON-LD
 *
 * Steps: the JPEG's near-white background is cleaned to pure white
 * (WhatsApp compression tints it), the canvas is padded so the emblem's
 * circle fits, then everything outside that circle is made transparent.
 * The circle was fitted by least squares to the navy arc; every artwork
 * pixel lies within 633px of its centre, so a 635px radius never clips.
 *
 * `sharp` arrives with Next; no extra dependency.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "Slike", "WhatsApp Image 2026-09-03 at 12.59.40 PM.jpeg");

const CX = 628.5;
const CY = 549.8;
const R = 635;

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += info.channels) {
  if (data[i] >= 236 && data[i + 1] >= 236 && data[i + 2] >= 236) {
    data[i] = data[i + 1] = data[i + 2] = 255;
  }
}

const padLeft = Math.ceil(R - CX);
const padTop = Math.ceil(R - CY);
const side = Math.ceil(2 * R) + 2;
const padRight = side - info.width - padLeft;
const cx = CX + padLeft;
const cy = CY + padTop;

const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}">` +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff"/></svg>`,
);

// Two passes: sharp runs `extract` before `extend` regardless of call
// order, so the padded canvas has to be materialised before cropping it
// to the square (the source is taller than the circle, so the white
// strip below the arc is cut away here).
const padded = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: info.channels },
})
  .extend({ top: padTop, left: padLeft, right: padRight, bottom: 0, background: "#ffffff" })
  .png()
  .toBuffer();

const badge = await sharp(padded)
  .extract({ left: 0, top: 0, width: side, height: side })
  .ensureAlpha()
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toBuffer();

await mkdir(join(ROOT, "src", "assets", "brand"), { recursive: true });

async function write(relPath, size, onWhite) {
  let img = sharp(badge).resize(size, size, { kernel: "lanczos3" });
  if (onWhite) img = img.flatten({ background: "#ffffff" });
  const out = await img.png({ compressionLevel: 9 }).toFile(join(ROOT, relPath));
  console.log(`${relPath}  ${out.width}x${out.height}  ${Math.round(out.size / 1024)} KB`);
}

await write("src/assets/brand/logo-badge.png", 800, false);
await write("src/app/icon.png", 256, false);
await write("src/app/apple-icon.png", 180, true);
await write("public/logo.png", 512, true);
