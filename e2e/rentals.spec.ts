import { expect, test } from "@playwright/test";
import { COPY } from "../src/config/copy";
import { PURPOSE_LABELS, soldLabel } from "../src/config/taxonomy";

/**
 * Sale vs. rent (migration 0013).
 *
 * The failure mode this guards against is quiet, not loud: a rent
 * rendered without its period reads as the asking price of a flat, and
 * a rental facet that is not canonical to itself competes with
 * /oglasi for the phrase people actually search.
 */

test("/izdavanje is canonical to itself and indexable", async ({ page }) => {
  await page.goto("/izdavanje");

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/izdavanje$/,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /^index/,
  );
});

test("the ?namena= twin of it is noindex, so the two never compete", async ({ page }) => {
  await page.goto("/oglasi?namena=izdavanje");

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/oglasi$/,
  );
});

test("rent is shown per month; a sale price is not", async ({ page }) => {
  await page.goto("/izdavanje");

  // Every priced card on the rental facet must carry the period. Without
  // it "650 €" is a plausible — and wrong — price for a flat.
  const prices = page.locator("article p.u-numeric");
  const count = await prices.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const text = (await prices.nth(i).innerText()).trim();
    if (text.startsWith(COPY.listing.priceOnRequest)) continue;
    expect(text).toContain(COPY.listing.perMonth);
  }

  await page.goto("/prodaja");
  const saleText = await page.locator("article p.u-numeric").first().innerText();
  expect(saleText).not.toContain(COPY.listing.perMonth);
});

test("a rented unit reads „Izdato”, never „Prodato”", async ({ page }) => {
  await page.goto("/izdavanje");

  const rented = page.locator("article").filter({ hasText: soldLabel("izdavanje") });
  await expect(rented.first()).toBeVisible();

  // The whole point of deriving the label from purpose: the rental
  // facet must never show the sale word.
  await expect(page.getByText(soldLabel("prodaja"), { exact: true })).toHaveCount(0);
});

test("the purpose filter narrows, and the facet routes never mix the two", async ({ page }) => {
  // Scoped to the cards: "Izdavanje" is also a nav and footer link, so
  // a page-wide assertion would only ever be testing the header.
  await page.goto("/prodaja");
  await expect(
    page.locator("article").filter({ hasText: PURPOSE_LABELS.izdavanje }),
  ).toHaveCount(0);

  await page.goto("/izdavanje");
  // Every card on this route is a rental, so each carries the chip.
  const articles = page.locator("article");
  const cards = await articles.count();
  expect(cards).toBeGreaterThan(0);
  await expect(articles.filter({ hasText: PURPOSE_LABELS.izdavanje })).toHaveCount(cards);
});

test("rental JSON-LD says LeaseOut with a monthly unit price", async ({ page }) => {
  await page.goto("/izdavanje");
  await page.locator("article h3 a").first().click();
  await expect(page).toHaveURL(/\/oglas\//);

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const product = blocks.find((b) => b.includes('"Product"'));
  expect(product).toBeTruthy();

  const parsed = JSON.parse(product!) as { offers?: Record<string, unknown> } | unknown[];
  const node = Array.isArray(parsed)
    ? (parsed.find((n) => (n as { offers?: unknown }).offers) as { offers: Record<string, unknown> })
    : (parsed as { offers?: Record<string, unknown> });

  // "Po dogovoru" listings carry no Offer at all — that is correct, and
  // there is nothing to assert about the period in that case.
  if (node?.offers) {
    expect(node.offers.businessFunction).toBe("http://purl.org/goodrelations/v1#LeaseOut");
    const spec = node.offers.priceSpecification as { referenceQuantity?: { unitCode?: string } };
    expect(spec?.referenceQuantity?.unitCode).toBe("MON");
  }
});

test("the contact page publishes phone, e-mail and opening hours", async ({ page }) => {
  await page.goto("/kontakt");

  await expect(page.getByText(COPY.pages.contact.hoursLabel)).toBeVisible();
  // The "we will publish these soon" notice must be gone now that both
  // are set — it is gated on phone AND email being null.
  await expect(page.getByText(COPY.pages.contact.pending)).toHaveCount(0);
});
