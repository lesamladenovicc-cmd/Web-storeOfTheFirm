import { expect, test, type Page } from "@playwright/test";

/**
 * /dashboard/prihod — the internal sales report.
 *
 * What matters here is SCOPE: a seller must see their own turnover and
 * nobody else's, and an admin must see the split. The mock backend has
 * no RLS, so these specs prove the application's own seller_id filter
 * does the work — which is exactly where the risk sits, because the
 * policy that scopes drafts does NOT scope sold listings (see the
 * header of lib/data/revenue.ts and the "revenue:" assertions in
 * `npm run verify:db`).
 */

const MOCK_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

const SELLER = {
  email: process.env.E2E_SELLER_EMAIL ?? "prodavac@jadranko.rs",
  password: process.env.E2E_SELLER_PASSWORD ?? "ProdavacLozinka2026!",
};
const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@jadranko.rs",
  password: process.env.E2E_ADMIN_PASSWORD ?? "AdminLozinka2026!",
};

/** Fixtures owned by the admin account — a seller must never see these. */
const ADMIN_SALE = /Hidraulična presa za lim/i;
const SELLER_SALE = /Kiper prikolica/i;

test.beforeEach(async ({ request }) => {
  if (process.env.E2E_RUN_SELLER) return;
  await request.post(`${MOCK_URL}/__reset`).catch(() => {});
});

async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/prijava");
  await page.getByLabel(/e-mail/i).fill(who.email);
  await page.getByLabel(/lozinka/i).fill(who.password);
  await page.getByRole("button", { name: /prijavi se/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/* ------------------------------------------------------------------ */

test("the report is reachable from the dashboard nav", async ({ page }) => {
  await login(page, SELLER);

  await page.getByRole("link", { name: /^prihod$/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/prihod/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/prihod od prodaje/i);
});

test("it is never indexable", async ({ page }) => {
  await login(page, SELLER);
  await page.goto("/dashboard/prihod");

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("SELLER — sees own turnover only, with no per-seller split", async ({ page }) => {
  await login(page, SELLER);
  await page.goto("/dashboard/prihod");

  // Their own sale is listed...
  const recent = page.getByRole("table").last();
  await expect(recent.getByText(SELLER_SALE)).toBeVisible();

  // ...the admin's is not, anywhere on the page.
  await expect(page.getByText(ADMIN_SALE)).toHaveCount(0);

  // And there is no seller breakdown to read other people's figures from.
  await expect(page.getByRole("heading", { name: /po prodavcu/i })).toHaveCount(0);
});

test("SELLER — an unpriced sale is counted but flagged, not summed", async ({ page }) => {
  await login(page, SELLER);
  await page.goto("/dashboard/prihod");

  // The seeded "Po dogovoru" sale drives this footnote.
  await expect(page.getByText(/po dogovoru.*ne u zbir/i)).toBeVisible();
});

test("ADMIN — sees every seller's turnover, split by seller", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/dashboard/prihod");

  await expect(page.getByRole("heading", { name: /po prodavcu/i })).toBeVisible();

  const sellers = page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: /prodavac/i }) })
    .first();
  await expect(sellers.getByText(/Marko Petrović/)).toBeVisible();
  await expect(sellers.getByText(/Administrator/)).toBeVisible();

  // Both accounts' sales appear in the report.
  await expect(page.getByText(ADMIN_SALE).first()).toBeVisible();
});

test("the twelve-month axis is always twelve months wide", async ({ page }) => {
  await login(page, SELLER);
  await page.goto("/dashboard/prihod");

  const chart = page.getByRole("region", { name: /prihod po mesecima/i });
  await expect(chart).toBeVisible();
  await expect(chart.getByRole("listitem")).toHaveCount(12);
});
