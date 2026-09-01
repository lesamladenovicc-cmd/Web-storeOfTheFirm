import { expect, test } from "@playwright/test";

/**
 * Seller flow. Requires the seeded accounts (`npm run seed:users`) and a
 * real Supabase project — skipped otherwise so the suite stays green on
 * a machine that only has the public storefront running.
 */

const EMAIL = process.env.E2E_SELLER_EMAIL ?? "prodavac@jadranko.rs";
const PASSWORD = process.env.E2E_SELLER_PASSWORD ?? "ProdavacLozinka2026!";

test.skip(
  !process.env.E2E_RUN_SELLER,
  "Set E2E_RUN_SELLER=1 with a seeded Supabase project to run these.",
);

async function login(page: import("@playwright/test").Page) {
  await page.goto("/prijava");
  await page.getByLabel(/e-mail/i).fill(EMAIL);
  await page.getByLabel(/lozinka/i).fill(PASSWORD);
  await page.getByRole("button", { name: /prijavi se/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("seller can sign in and reach their listings", async ({ page }) => {
  await login(page);

  await page.getByRole("link", { name: /moji oglasi/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/oglasi/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("publishing without an image is rejected", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/oglasi/novi");

  await page.getByLabel(/naziv oglasa/i).fill("Test oglas bez fotografije");
  await page
    .getByLabel(/^opis/i)
    .fill("Ovo je test opis koji je dovoljno dugačak da prođe validaciju.");
  await page.getByLabel(/lokacija/i).fill("Novi Sad");

  await page.getByRole("button", { name: /^objavi$/i }).click();

  // The publish schema requires at least one photo.
  await expect(page.getByText(/fotografij/i).first()).toBeVisible();
});

test("a draft saves and stays out of the public index", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/oglasi/novi");

  const title = `Nacrt test ${Date.now()}`;
  await page.getByLabel(/naziv oglasa/i).fill(title);
  await page.getByRole("button", { name: /sačuvaj kao nacrt/i }).click();

  await expect(page).toHaveURL(/\/izmena/);
  await expect(page.getByText(/nacrt/i).first()).toBeVisible();

  // A draft must not be reachable or searchable publicly.
  await page.goto(`/oglasi?q=${encodeURIComponent(title)}`);
  await expect(page.getByText(title)).toHaveCount(0);
});

test("seller cannot open another seller's listing", async ({ page }) => {
  await login(page);

  // A well-formed uuid that does not belong to this seller. RLS hides
  // it, so the page must 404 rather than 403 — its existence is never
  // confirmed.
  const response = await page.goto(
    "/dashboard/oglasi/00000000-0000-4000-8000-000000000000/izmena",
  );
  expect(response?.status()).toBe(404);
});
