import { describe, expect, it } from "vitest";
import {
  countWithNoun,
  formatCompactRsd,
  formatDate,
  formatDateTime,
  formatMonthLabel,
  formatPhone,
  formatPrice,
  formatRelativeDate,
  formatRsd,
  groupDigits,
  maskPhone,
  normalizePhone,
  pluralize,
  toIsoDate,
  truncate,
  whatsappHref,
} from "./format";

describe("groupDigits / formatRsd", () => {
  it("groups thousands with Serbian dot separators", () => {
    expect(groupDigits(0)).toBe("0");
    expect(groupDigits(950)).toBe("950");
    expect(groupDigits(1950)).toBe("1.950");
    expect(groupDigits(19500)).toBe("19.500");
    expect(groupDigits(195000)).toBe("195.000");
    expect(groupDigits(1950000)).toBe("1.950.000");
    expect(groupDigits(1234567890)).toBe("1.234.567.890");
  });

  it("formats the canonical example from the brief", () => {
    expect(formatRsd(1950)).toBe("1.950 din");
  });

  it("falls back to 'Po dogovoru' for a null price", () => {
    expect(formatPrice(null)).toBe("Po dogovoru");
    expect(formatPrice(undefined)).toBe("Po dogovoru");
    expect(formatPrice(0)).toBe("0 din");
    expect(formatPrice(1950000)).toBe("1.950.000 din");
  });
});

describe("pluralize", () => {
  const oglas = ["oglas", "oglasa", "oglasa"] as const;
  const masina = ["mašina", "mašine", "mašina"] as const;

  it("uses the singular form for 1, 21, 31 but not 11", () => {
    expect(pluralize(1, oglas)).toBe("oglas");
    expect(pluralize(21, oglas)).toBe("oglas");
    expect(pluralize(101, oglas)).toBe("oglas");
    expect(pluralize(11, oglas)).toBe("oglasa");
  });

  it("uses the paucal form for 2-4, 22-24 but not 12-14", () => {
    expect(pluralize(2, masina)).toBe("mašine");
    expect(pluralize(3, masina)).toBe("mašine");
    expect(pluralize(4, masina)).toBe("mašine");
    expect(pluralize(22, masina)).toBe("mašine");
    expect(pluralize(12, masina)).toBe("mašina");
    expect(pluralize(13, masina)).toBe("mašina");
  });

  it("uses the genitive plural for 0, 5-20 and 25+", () => {
    expect(pluralize(0, oglas)).toBe("oglasa");
    expect(pluralize(5, oglas)).toBe("oglasa");
    expect(pluralize(47, oglas)).toBe("oglasa");
  });

  it("renders counts with the correct noun", () => {
    expect(countWithNoun(1, "oglas")).toBe("1 oglas");
    expect(countWithNoun(3, "oglas")).toBe("3 oglasa");
    expect(countWithNoun(47, "oglas")).toBe("47 oglasa");
    expect(countWithNoun(1500, "oglas")).toBe("1.500 oglasa");
  });
});

describe("dates", () => {
  it("formats Serbian short dates with the trailing dot", () => {
    expect(formatDate(new Date(2026, 7, 31))).toBe("31.08.2026.");
    expect(formatDate(new Date(2026, 0, 5))).toBe("05.01.2026.");
  });

  it("formats date-times", () => {
    expect(formatDateTime(new Date(2026, 7, 31, 14, 5))).toBe("31.08.2026. u 14:05");
  });

  it("produces ISO dates for JSON-LD", () => {
    expect(toIsoDate(new Date(2026, 7, 31))).toBe("2026-08-31");
  });

  it("returns an empty string for invalid input", () => {
    expect(formatDate("not-a-date")).toBe("");
    expect(toIsoDate("not-a-date")).toBe("");
  });

  it("formats relative dates against an injected clock", () => {
    const now = new Date(2026, 7, 31, 12, 0);
    expect(formatRelativeDate(new Date(2026, 7, 31, 8, 0), now)).toBe("danas");
    expect(formatRelativeDate(new Date(2026, 7, 30), now)).toBe("juče");
    expect(formatRelativeDate(new Date(2026, 7, 28), now)).toBe("pre 3 dana");
    expect(formatRelativeDate(new Date(2026, 7, 21), now)).toBe("pre nedelju dana");
    expect(formatRelativeDate(new Date(2026, 7, 17), now)).toBe("pre 2 nedelje");
    expect(formatRelativeDate(new Date(2026, 5, 1), now)).toBe("01.06.2026.");
  });
});

describe("phone numbers", () => {
  it("normalises Serbian formats to E.164", () => {
    expect(normalizePhone("064 123 4567")).toBe("+381641234567");
    expect(normalizePhone("064/123-4567")).toBe("+381641234567");
    expect(normalizePhone("0641234567")).toBe("+381641234567");
    expect(normalizePhone("+381641234567")).toBe("+381641234567");
    expect(normalizePhone("00381641234567")).toBe("+381641234567");
    expect(normalizePhone("381641234567")).toBe("+381641234567");
    expect(normalizePhone("011 234 567")).toBe("+38111234567");
  });

  it("rejects non-Serbian and malformed numbers", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("+49 170 1234567")).toBeNull();
    expect(normalizePhone("06412")).toBeNull();
    expect(normalizePhone("abcdefgh")).toBeNull();
  });

  it("formats E.164 back to Serbian display form", () => {
    expect(formatPhone("+381641234567")).toBe("064 123 4567");
    expect(formatPhone("+38111234567")).toBe("011 234 567");
    expect(formatPhone(null)).toBe("");
  });

  it("masks the trailing digits before reveal", () => {
    expect(maskPhone("+381641234567")).toBe("064 123 ****");
  });

  it("builds a WhatsApp link without the plus", () => {
    expect(whatsappHref("+381641234567")).toBe("https://wa.me/381641234567");
  });
});

describe("truncate", () => {
  it("collapses whitespace and leaves short text alone", () => {
    expect(truncate("Bager   guseničar", 50)).toBe("Bager guseničar");
  });

  it("truncates on a word boundary with an ellipsis", () => {
    const out = truncate("Bager guseničar 2018 sa niskim brojem radnih sati i kompletnom", 30);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(31);
    expect(out).not.toContain("  ");
  });
});

describe("formatCompactRsd", () => {
  it("leaves amounts under a thousand grouped and unabbreviated", () => {
    expect(formatCompactRsd(0)).toBe("0");
    expect(formatCompactRsd(950)).toBe("950");
  });

  it("abbreviates thousands and millions with a decimal comma", () => {
    expect(formatCompactRsd(1000)).toBe("1 hilj");
    expect(formatCompactRsd(18500)).toBe("18,5 hilj");
    expect(formatCompactRsd(450000)).toBe("450 hilj");
    expect(formatCompactRsd(1_450_000)).toBe("1,5 mil");
    expect(formatCompactRsd(8_450_000)).toBe("8,5 mil");
  });

  it("drops a trailing zero decimal", () => {
    expect(formatCompactRsd(2_000_000)).toBe("2 mil");
    expect(formatCompactRsd(11_000)).toBe("11 hilj");
  });

  it("keeps the minus sign on a negative amount", () => {
    expect(formatCompactRsd(-40_000)).toBe("-40 hilj");
  });
});

describe("formatMonthLabel", () => {
  it("gives a short axis label with a two-digit year", () => {
    expect(formatMonthLabel(2026, 0)).toBe("jan 26");
    expect(formatMonthLabel(2026, 8)).toBe("sep 26");
    expect(formatMonthLabel(2025, 11)).toBe("dec 25");
  });

  it("gives the full Latin-script Serbian month when asked", () => {
    expect(formatMonthLabel(2026, 8, { short: false })).toBe("septembar 2026.");
    expect(formatMonthLabel(2026, 7, { short: false })).toBe("avgust 2026.");
  });
});
