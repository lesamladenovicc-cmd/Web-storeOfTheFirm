import { describe, expect, it } from "vitest";
import {
  buildCategorySlug,
  buildListingSlug,
  isValidSlug,
  slugify,
  slugSuffix,
  transliterate,
} from "./slug";

describe("transliterate", () => {
  it("maps Serbian Latin diacritics to ASCII", () => {
    expect(transliterate("čćšž")).toBe("ccsz");
    expect(transliterate("đ")).toBe("dj");
    expect(transliterate("ČĆŠŽĐ")).toBe("ccszdj");
    expect(transliterate("guseničar")).toBe("gusenicar");
    expect(transliterate("Đorđe")).toBe("djordje");
  });

  it("maps Serbian Cyrillic to Latin ASCII", () => {
    expect(transliterate("машина")).toBe("masina");
    expect(transliterate("Београд")).toBe("beograd");
    expect(transliterate("бager")).toBe("bager");
    expect(transliterate("љубав")).toBe("ljubav");
    expect(transliterate("њива")).toBe("njiva");
    expect(transliterate("џак")).toBe("dzak");
  });

  it("strips combining marks left over after decomposition", () => {
    // "č" written as c + U+030C rather than the precomposed character.
    expect(transliterate("čekić")).toBe("cekic");
  });

  it("leaves plain ASCII untouched", () => {
    expect(transliterate("Bager 2018")).toBe("Bager 2018");
  });
});

describe("slugify", () => {
  it("builds clean lowercase slugs", () => {
    expect(slugify("Bager guseničar 2018")).toBe("bager-gusenicar-2018");
    expect(slugify("Traktor IMT 539, 4200 h")).toBe("traktor-imt-539-4200-h");
    expect(slugify("Виљушкар Linde")).toBe("viljuskar-linde");
  });

  it("collapses punctuation and trims separators", () => {
    expect(slugify("  ---Mašina!!!  za   drvo---  ")).toBe("masina-za-drvo");
    expect(slugify("A / B \\ C")).toBe("a-b-c");
  });

  it("truncates on a separator boundary", () => {
    const out = slugify("bager gusenicar dvehiljadeosamnaest sa niskim brojem radnih sati", 30);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.endsWith("-")).toBe(false);
    expect(isValidSlug(out)).toBe(true);
  });

  it("returns an empty string when there is nothing slug-worthy", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("slugSuffix", () => {
  it("produces a lowercase alphanumeric suffix of the requested length", () => {
    const suffix = slugSuffix();
    expect(suffix).toHaveLength(6);
    expect(/^[a-z0-9]{6}$/.test(suffix)).toBe(true);
  });

  it("is effectively unique across many draws", () => {
    const seen = new Set(Array.from({ length: 500 }, () => slugSuffix()));
    expect(seen.size).toBeGreaterThan(495);
  });
});

describe("buildListingSlug", () => {
  it("appends a unique suffix to the title slug", () => {
    const slug = buildListingSlug("Bager guseničar 2018");
    expect(slug).toMatch(/^bager-gusenicar-2018-[a-z0-9]{6}$/);
    expect(isValidSlug(slug)).toBe(true);
  });

  it("falls back to a safe base for unusable titles", () => {
    expect(buildListingSlug("!!!")).toMatch(/^oglas-[a-z0-9]{6}$/);
    expect(buildListingSlug("ć")).toMatch(/^oglas-[a-z0-9]{6}$/);
  });
});

describe("buildCategorySlug", () => {
  it("slugifies category names", () => {
    expect(buildCategorySlug("Građevinske mašine")).toBe("gradjevinske-masine");
    expect(buildCategorySlug("Viljuškari i transport")).toBe("viljuskari-i-transport");
  });

  it("falls back for unusable names", () => {
    expect(buildCategorySlug("—")).toBe("kategorija");
  });
});

describe("isValidSlug", () => {
  it("accepts well-formed slugs", () => {
    expect(isValidSlug("bager-gusenicar-2018-a1b2c3")).toBe(true);
    expect(isValidSlug("alati")).toBe(true);
  });

  it("rejects malformed or hostile values", () => {
    expect(isValidSlug("Bager")).toBe(false);
    expect(isValidSlug("bager--gusenicar")).toBe(false);
    expect(isValidSlug("-bager")).toBe(false);
    expect(isValidSlug("bager-")).toBe(false);
    expect(isValidSlug("../etc/passwd")).toBe(false);
    expect(isValidSlug("bager gusenicar")).toBe(false);
    expect(isValidSlug("a".repeat(101))).toBe(false);
  });
});
