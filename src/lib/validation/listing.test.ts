import { describe, expect, it } from "vitest";
import {
  listingDraftSchema,
  listingPublishSchema,
  phoneIsUsable,
  schemaForStatus,
} from "./listing";

/**
 * The draft/publish split is the rule set that decides whether a listing
 * can go live. Every bound here mirrors a CHECK constraint in the
 * migrations, so a change that drifts from the database shows up as a
 * failure rather than as a runtime insert error in front of a seller.
 */

const SELLER = "22222222-2222-4222-8222-222222222222";
const LISTING = "33333333-3333-4333-8333-333333333333";

/** A complete, publishable listing. Tests override one field at a time. */
function publishable(overrides: Record<string, unknown> = {}) {
  return {
    title: "Bager guseničar CAT 320D",
    description:
      "Redovno servisiran, gusenice na 70%, hidraulika bez curenja. Može se pogledati.",
    condition: "korisceno",
    priceRsd: 8_450_000,
    isNegotiable: true,
    location: "Novi Sad",
    categoryId: "44444444-4444-4444-8444-444444444444",
    contactName: "Marko Petrović",
    contactPhone: "064 111 0002",
    contactEmail: "",
    imagePaths: [`${SELLER}/${LISTING}/foto-1.webp`],
    status: "aktivan",
    ...overrides,
  };
}

describe("draft schema — deliberately lenient", () => {
  it("accepts a half-finished listing", () => {
    const result = listingDraftSchema.safeParse({
      title: "Nacrt oglasa",
      description: "",
      condition: "novo",
      priceRsd: null,
      isNegotiable: false,
      location: "",
      categoryId: null,
      contactName: "",
      contactPhone: null,
      contactEmail: null,
      imagePaths: [],
      status: "nacrt",
    });
    expect(result.success).toBe(true);
  });

  it("still enforces the title bounds a draft shares with the DB", () => {
    const tooShort = listingDraftSchema.safeParse({
      title: "abc",
      description: "",
      condition: "novo",
      priceRsd: null,
      isNegotiable: false,
      location: "",
      categoryId: null,
      contactName: "",
      contactPhone: null,
      contactEmail: null,
      imagePaths: [],
      status: "nacrt",
    });
    expect(tooShort.success).toBe(false);
  });
});

describe("publish schema — the rules that protect the buyer", () => {
  it("accepts a complete listing", () => {
    const result = listingPublishSchema.safeParse(publishable());
    expect(result.success).toBe(true);
  });

  it("requires at least one photo", () => {
    const result = listingPublishSchema.safeParse(publishable({ imagePaths: [] }));
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("imagePaths");
  });

  it("requires a category", () => {
    const result = listingPublishSchema.safeParse(publishable({ categoryId: null }));
    expect(result.success).toBe(false);
  });

  it("requires a location", () => {
    const result = listingPublishSchema.safeParse(publishable({ location: "" }));
    expect(result.success).toBe(false);
  });

  it("requires a description long enough to be useful", () => {
    const result = listingPublishSchema.safeParse(publishable({ description: "Kratko" }));
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("description");
  });

  it("requires at least one way to reach the seller", () => {
    const result = listingPublishSchema.safeParse(
      publishable({ contactPhone: null, contactEmail: "" }),
    );
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("contactPhone");
  });

  it("accepts email-only contact", () => {
    const result = listingPublishSchema.safeParse(
      publishable({ contactPhone: null, contactEmail: "prodavac@primer.rs" }),
    );
    expect(result.success).toBe(true);
  });

  it("normalises the phone to E.164 so the DB never holds mixed formats", () => {
    const result = listingPublishSchema.safeParse(
      publishable({ contactPhone: "064/111-0002" }),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.contactPhone).toBe("+381641110002");
  });

  it("turns a blank email into null rather than an empty string", () => {
    const result = listingPublishSchema.safeParse(publishable({ contactEmail: "" }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.contactEmail).toBeNull();
  });
});

describe("price", () => {
  it("allows null — that is 'Po dogovoru', not zero", () => {
    const result = listingPublishSchema.safeParse(publishable({ priceRsd: null }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priceRsd).toBeNull();
  });

  it("allows zero as a real price", () => {
    const result = listingPublishSchema.safeParse(publishable({ priceRsd: 0 }));
    expect(result.success).toBe(true);
  });

  it("rejects a negative price", () => {
    const result = listingPublishSchema.safeParse(publishable({ priceRsd: -1 }));
    expect(result.success).toBe(false);
  });

  it("rejects a price beyond the DB check constraint", () => {
    const result = listingPublishSchema.safeParse(publishable({ priceRsd: 2_000_000_001 }));
    expect(result.success).toBe(false);
  });

  it("rejects a fractional price — RSD subunits are not used", () => {
    const result = listingPublishSchema.safeParse(publishable({ priceRsd: 1950.5 }));
    expect(result.success).toBe(false);
  });
});

describe("images", () => {
  it("accepts up to ten", () => {
    const paths = Array.from({ length: 10 }, (_, i) => `${SELLER}/${LISTING}/f${i}.webp`);
    const result = listingPublishSchema.safeParse(publishable({ imagePaths: paths }));
    expect(result.success).toBe(true);
  });

  it("rejects an eleventh", () => {
    const paths = Array.from({ length: 11 }, (_, i) => `${SELLER}/${LISTING}/f${i}.webp`);
    const result = listingPublishSchema.safeParse(publishable({ imagePaths: paths }));
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("imagePaths");
  });
});

describe("schemaForStatus", () => {
  it("picks the lenient schema only for an explicit draft", () => {
    expect(schemaForStatus("nacrt")).toBe(listingDraftSchema);
  });

  it("falls through to the strict schema for anything else", () => {
    // A status the client invented must not get draft leniency.
    expect(schemaForStatus("aktivan")).toBe(listingPublishSchema);
    expect(schemaForStatus("prodato")).toBe(listingPublishSchema);
    expect(schemaForStatus("izmisljeno")).toBe(listingPublishSchema);
    expect(schemaForStatus(undefined)).toBe(listingPublishSchema);
  });

  it("rejects a made-up status even through the strict schema", () => {
    const result = listingPublishSchema.safeParse(publishable({ status: "izmisljeno" }));
    expect(result.success).toBe(false);
  });
});

describe("phoneIsUsable", () => {
  it("treats blank as usable — phone is optional on a draft", () => {
    expect(phoneIsUsable("")).toBe(true);
    expect(phoneIsUsable(null)).toBe(true);
    expect(phoneIsUsable(undefined)).toBe(true);
  });

  it("accepts Serbian formats", () => {
    expect(phoneIsUsable("064 111 0002")).toBe(true);
    expect(phoneIsUsable("+381641110002")).toBe(true);
  });

  it("rejects nonsense, so the seller sees 'invalid phone' and not 'no contact'", () => {
    expect(phoneIsUsable("123")).toBe(false);
    expect(phoneIsUsable("+49 170 1234567")).toBe(false);
  });
});

function issuePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  if (result.success || !result.error) return [];
  return result.error.issues.map((i) => i.path.join("."));
}
