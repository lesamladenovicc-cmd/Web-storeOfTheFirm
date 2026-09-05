/**
 * FORMAT — Serbian (sr-RS) display formatting.
 *
 * Deliberately hand-rolled instead of using `Intl.NumberFormat` /
 * `Intl.DateTimeFormat`. Node's ICU build on the server and the browser's
 * ICU can disagree on the sr-RS group separator and date pattern, which
 * produces a React hydration mismatch on the most visible string on the
 * page (the price). Deterministic string building removes that entire
 * class of bug and costs a few lines.
 */

import { COPY } from "@/config/copy";
import { SITE } from "@/config/site";

/* ------------------------------------------------------------------ */
/* Numbers & money                                                     */
/* ------------------------------------------------------------------ */

/**
 * Groups an integer with Serbian thousands separators (`.`).
 * 1950 → "1.950" · 1950000 → "1.950.000"
 */
export function groupDigits(value: number): string {
  const negative = value < 0;
  const digits = Math.floor(Math.abs(value)).toString();

  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ".";
    out += digits[i];
  }
  return negative ? `-${out}` : out;
}

/**
 * Formats an RSD amount for display: 1950 → "1.950 din".
 * Amounts are whole dinars; RSD subunits are not used in practice.
 */
export function formatRsd(amount: number): string {
  return `${groupDigits(amount)} ${SITE.currencySuffix}`;
}

/**
 * Price for a listing, where `null` means the seller wants to negotiate.
 * null → "Po dogovoru"
 */
export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return COPY.listing.priceOnRequest;
  return formatRsd(amount);
}

/** Plain grouped integer, no currency (view counts, result counts). */
export function formatNumber(value: number): string {
  return groupDigits(value);
}

/**
 * Abbreviated RSD for axis labels, where a full "8.450.000 din" would
 * not fit in a 70px column: 8450000 → "8,4 mil" · 450000 → "450 hilj".
 * Decimal comma, one place, trailing ",0" dropped — Serbian convention.
 *
 * Display only. Never use it where the exact figure matters; the tables
 * and the totals always show `formatRsd`.
 */
export function formatCompactRsd(amount: number): string {
  const abs = Math.abs(amount);
  if (abs < 1000) return groupDigits(amount);

  const [divisor, unit] = abs >= 1_000_000 ? [1_000_000, "mil"] : [1000, "hilj"];
  // Built from the absolute value, then re-signed: Math.trunc(-0.4) is
  // -0, and -0 formats as "0", which would silently drop the minus.
  const tenths = Math.round((abs / divisor) * 10);
  const whole = Math.floor(tenths / 10);
  const decimal = tenths % 10;

  const digits = decimal === 0 ? groupDigits(whole) : `${groupDigits(whole)},${decimal}`;
  return `${amount < 0 ? "-" : ""}${digits} ${unit}`;
}

/* ------------------------------------------------------------------ */
/* Plurals                                                             */
/* ------------------------------------------------------------------ */

/**
 * Serbian has three plural forms. Using `n === 1 ? a : b` reads as
 * machine translation, so this implements the real Slavic rule.
 *
 * pluralize(1,  ["oglas", "oglasa", "oglasa"]) → "oglas"
 * pluralize(3,  [...])                          → "oglasa"
 * pluralize(47, [...])                          → "oglasa"
 * pluralize(22, ["mašina","mašine","mašina"])   → "mašine"
 */
export function pluralize(
  count: number,
  forms: readonly [one: string, few: string, many: string],
): string {
  const n = Math.abs(Math.floor(count));
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return forms[1];
  return forms[2];
}

/** Common noun forms used across the storefront. */
export const PLURALS = {
  oglas: ["oglas", "oglasa", "oglasa"],
  rezultat: ["rezultat", "rezultata", "rezultata"],
  slika: ["slika", "slike", "slika"],
  dan: ["dan", "dana", "dana"],
  nedelja: ["nedelja", "nedelje", "nedelja"],
  mesec: ["mesec", "meseca", "meseci"],
  upit: ["upit", "upita", "upita"],
  korisnik: ["korisnik", "korisnika", "korisnika"],
} as const satisfies Record<string, readonly [string, string, string]>;

/** "47 oglasa" — count plus the correctly inflected noun. */
export function countWithNoun(count: number, key: keyof typeof PLURALS): string {
  return `${formatNumber(count)} ${pluralize(count, PLURALS[key])}`;
}

/**
 * Genitive forms required after the preposition "pre" ("pre 3 dana").
 * The nominative counting forms above are wrong in that position —
 * "pre 1 nedelja" is a classic machine-translation tell.
 */
const GENITIVE_AFTER_PRE = {
  dan: ["dana", "dana", "dana"],
  nedelja: ["nedelje", "nedelje", "nedelja"],
  mesec: ["meseca", "meseca", "meseci"],
} as const satisfies Record<string, readonly [string, string, string]>;

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Serbian short date. The trailing dot is correct and intentional:
 * "31.08.2026." — omitting it is a common localisation error.
 */
export function formatDate(value: string | Date): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}.`;
}

/** "31.08.2026. u 14:05" — used in the dashboard inquiry list. */
export function formatDateTime(value: string | Date): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatDate(d)} u ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Serbian month names. Hand-rolled for the same reason as everything
 * else here — and because Node's sr-RS data returns "септембар" in
 * Cyrillic unless the locale is spelled sr-Latn-RS, which is exactly
 * the kind of environment-dependent surprise this module exists to
 * avoid. The store is Latin script throughout.
 */
const MONTHS = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "jun",
  "jul",
  "avgust",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
] as const;

const MONTHS_SHORT = [
  "jan",
  "feb",
  "mar",
  "apr",
  "maj",
  "jun",
  "jul",
  "avg",
  "sep",
  "okt",
  "nov",
  "dec",
] as const;

/**
 * Month label for the revenue chart and its table fallback.
 * (2026, 8) → "sep 26" · short:false → "septembar 2026."
 */
export function formatMonthLabel(
  year: number,
  monthIndex: number,
  options?: { short?: boolean },
): string {
  const i = ((monthIndex % 12) + 12) % 12;
  if (options?.short === false) return `${MONTHS[i]} ${year}.`;
  return `${MONTHS_SHORT[i]} ${String(year).slice(-2)}`;
}

/** ISO date (YYYY-MM-DD) for <time dateTime> and JSON-LD. */
export function toIsoDate(value: string | Date): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Relative date for recent items, absolute past 30 days.
 * "danas" · "juče" · "pre 3 dana" · "pre 2 nedelje" · "31.08.2026."
 *
 * `now` is injectable so tests are not clock-dependent.
 */
export function formatRelativeDate(value: string | Date, now: Date = new Date()): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "";

  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);

  if (days < 0) return formatDate(d);
  if (days === 0) return "danas";
  if (days === 1) return "juče";
  if (days < 7) return `pre ${days} ${pluralize(days, GENITIVE_AFTER_PRE.dan)}`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    // "pre nedelju dana" is the idiomatic Serbian for exactly one week;
    // "pre 1 nedelje" is grammatical but reads translated.
    if (weeks === 1) return "pre nedelju dana";
    return `pre ${weeks} ${pluralize(weeks, GENITIVE_AFTER_PRE.nedelja)}`;
  }
  return formatDate(d);
}

/* ------------------------------------------------------------------ */
/* Phone numbers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Normalises a Serbian phone number to E.164 (+381…).
 * Accepts "064 123 4567", "064/123-4567", "0641234567",
 * "+381641234567", "00381641234567", "381641234567".
 *
 * Returns null when the input cannot be a valid RS number, so callers
 * can reject at the validation boundary rather than storing garbage.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let digits = raw.replace(/[^\d+]/g, "");

  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("+")) {
    if (!digits.startsWith("+381")) return null;
    digits = digits.slice(4);
  } else if (digits.startsWith("381")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  } else {
    return null;
  }

  digits = digits.replace(/\D/g, "");
  // RS national significant numbers run 8–9 digits after the country code.
  if (!/^\d{8,9}$/.test(digits)) return null;

  return `+381${digits}`;
}

/**
 * Display form of an E.164 RS number: "+381641234567" → "064 123 4567".
 * Falls back to the input when it is not a recognised E.164 value.
 */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = /^\+381(\d{8,9})$/.exec(e164);
  if (!m || !m[1]) return e164;

  const local = `0${m[1]}`;
  if (local.length === 10) {
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/** `tel:` href. */
export function telHref(e164: string): string {
  return `tel:${e164}`;
}

/** Viber deep link — expects the `+` to be percent-encoded. */
export function viberHref(e164: string): string {
  return `viber://chat?number=${encodeURIComponent(e164)}`;
}

/** WhatsApp deep link — expects digits only, no `+`. */
export function whatsappHref(e164: string): string {
  return `https://wa.me/${e164.replace(/\D/g, "")}`;
}

/**
 * Masked phone used before the "Prikaži broj" reveal.
 * "+381641234567" → "064 123 ****"
 */
export function maskPhone(e164: string): string {
  const display = formatPhone(e164);
  if (!display) return "";
  return display.replace(/\d(?=\d{0,3}$)/g, "*");
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

/** Collapses whitespace and truncates on a word boundary. */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Plain-text, single-line version of a description — for meta and JSON-LD. */
export function toPlainText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
