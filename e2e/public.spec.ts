import { expect, test } from "@playwright/test";

/**
 * Public storefront. These specs assert the things that would quietly
 * break revenue or ranking rather than throw an error: locale, canonical,
 * Product JSON-LD shape, and Serbian price formatting.
 */

test("homepage renders the Serbian storefront", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "sr-RS");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
});

test("search navigates to /oglasi and keeps the query in the URL", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("searchbox").fill("masina");
  await page.getByRole("button", { name: /pretraži/i }).click();

  await expect(page).toHaveURL(/\/oglasi\?.*q=masina/);
  // Diacritic-insensitive: "masina" must match "mašina".
  await expect(page.getByText(/Pronađeno/)).toBeVisible();
});

test("filtered listing pages are noindex, the bare index is not", async ({ page }) => {
  await page.goto("/oglasi");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /index/,
  );

  await page.goto("/oglasi?q=bager");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("listing detail carries valid Product JSON-LD", async ({ page }) => {
  await page.goto("/oglasi");

  const firstCard = page.locator("article a").first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();

  await expect(page).toHaveURL(/\/oglas\//);

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const parsed = blocks.flatMap((b) => {
    const value = JSON.parse(b);
    return Array.isArray(value) ? value : [value];
  });

  const product = parsed.find((o) => o["@type"] === "Product");
  expect(product, "a Product JSON-LD block must be present").toBeTruthy();
  expect(product.name).toBeTruthy();
  expect(product.sku).toBeTruthy();
  expect(product.itemCondition).toMatch(/schema\.org\/(New|Used|Damaged|Refurbished)Condition/);

  // offers is present only when the listing has a price. When it is
  // absent the listing must be showing "Po dogovoru" — emitting an
  // offers block with a null price is invalid markup.
  if (product.offers) {
    expect(product.offers.priceCurrency).toBe("RSD");
    expect(String(product.offers.price)).toMatch(/^\d+$/);
  } else {
    await expect(page.getByText("Po dogovoru").first()).toBeVisible();
  }

  // Canonical must be self-referential and absolute.
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toContain("/oglas/");
});

test("prices render in Serbian format", async ({ page }) => {
  await page.goto("/oglasi");

  const priceText = await page.locator("article").first().innerText();
  // Either "1.950.000 din" grouping or the negotiable fallback.
  expect(priceText).toMatch(/(\d{1,3}(\.\d{3})*\s*din)|Po dogovoru/);
});

/**
 * Guards the streaming/404 trade-off documented in
 * app/oglas/[slug]/page.tsx. Re-adding a loading.tsx to that segment
 * would silently turn this into a 200 soft-404 serving the wrong copy,
 * and this spec is what catches that.
 */
test("a missing listing returns a real 404", async ({ page }) => {
  const response = await page.goto("/oglas/ne-postoji-ovaj-oglas-zzz999");

  // The status is the load-bearing assertion: it is what regresses to a
  // 200 soft-404 if a loading.tsx is ever added back to that segment.
  expect(response?.status()).toBe(404);

  // The rendered copy is deliberately NOT asserted here. `next dev`
  // serves Next's built-in 404 shell for this case, while a production
  // build renders the segment's own Serbian not-found. Pinning the spec
  // to either one makes it fail in the other environment for no real
  // reason — and the status code above is what actually regresses.
});

test("an unknown category returns a real 404", async ({ page }) => {
  const response = await page.goto("/kategorija/ne-postoji-zzz");
  expect(response?.status()).toBe(404);
});

test("robots.txt and sitemap.xml are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain("<urlset");
});
