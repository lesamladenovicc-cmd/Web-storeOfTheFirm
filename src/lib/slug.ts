/**
 * SLUG — Serbian-aware URL slug generation.
 *
 * Handles both Serbian Latin (č ć š ž đ) and Cyrillic input, so a title
 * typed in either script produces a clean ASCII URL. Serbian URLs are a
 * real ranking and click-through signal on .rs queries, so slugs are
 * generated from the title rather than from the id.
 */

/** Serbian Latin digraphs and diacritics → ASCII. Order matters: đ before d. */
const LATIN_MAP: Record<string, string> = {
  č: "c",
  ć: "c",
  đ: "dj",
  š: "s",
  ž: "z",
  Č: "c",
  Ć: "c",
  Đ: "dj",
  Š: "s",
  Ž: "z",
};

/** Serbian Cyrillic → Latin ASCII. */
const CYRILLIC_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ђ: "dj",
  е: "e",
  ж: "z",
  з: "z",
  и: "i",
  ј: "j",
  к: "k",
  л: "l",
  љ: "lj",
  м: "m",
  н: "n",
  њ: "nj",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ћ: "c",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "c",
  џ: "dz",
  ш: "s",
};

/**
 * Converts Serbian text (either script) to lowercase ASCII.
 * "Bager gusenečar — Đorđe" → "bager gusenecar — djordje"
 */
export function transliterate(input: string): string {
  let out = "";
  for (const char of input) {
    const latin = LATIN_MAP[char];
    if (latin !== undefined) {
      out += latin;
      continue;
    }
    const lower = char.toLowerCase();
    const cyr = CYRILLIC_MAP[lower];
    if (cyr !== undefined) {
      out += cyr;
      continue;
    }
    out += char;
  }
  // Strip any remaining combining marks (e.g. pasted composed characters).
  return out.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/**
 * Builds a URL-safe slug fragment.
 * "Bager guseničar 2018, 4200 h" → "bager-gusenicar-2018-4200-h"
 */
export function slugify(input: string, maxLength = 80): string {
  const base = transliterate(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length <= maxLength) return base;
  const cut = base.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  return lastDash > maxLength * 0.5 ? cut.slice(0, lastDash) : cut;
}

const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Short random suffix that makes a title-derived slug unique without a
 * database round-trip. Six chars over 36 symbols is ample at MVP volume.
 */
export function slugSuffix(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length];
  }
  return out;
}

/**
 * Full listing slug: "bager-gusenicar-2018-a1b2c3".
 *
 * A published listing's slug is never regenerated on title edit — that
 * would break the canonical URL and any inbound link. Callers enforce
 * that rule; this function only builds the string.
 */
export function buildListingSlug(title: string): string {
  const base = slugify(title, 72);
  const safeBase = base.length >= 3 ? base : "oglas";
  return `${safeBase}-${slugSuffix()}`;
}

/** Slug for an admin-created category; uniqueness is enforced by the DB. */
export function buildCategorySlug(name: string): string {
  const base = slugify(name, 60);
  return base.length >= 2 ? base : "kategorija";
}

/** Guard for untrusted slug values arriving from route params. */
export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;
}
