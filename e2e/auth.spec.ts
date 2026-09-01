import { expect, test } from "@playwright/test";

/**
 * Access control at the route level.
 *
 * This is layer 1 of 3 (proxy.ts). It is NOT the security boundary —
 * RLS is, and that is covered by `npm run verify:db`, which asserts the
 * policies directly against Postgres. These specs check that the UX
 * layer does not hand an anonymous visitor a broken dashboard.
 */

const PROTECTED = [
  "/dashboard",
  "/dashboard/oglasi",
  "/dashboard/oglasi/novi",
  "/dashboard/upiti",
  "/dashboard/podesavanja",
  "/dashboard/admin/korisnici",
  "/dashboard/admin/kategorije",
];

for (const path of PROTECTED) {
  test(`anonymous visitor is redirected away from ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/prijava/);
  });
}

test("the intended destination is preserved as a relative path", async ({ page }) => {
  await page.goto("/dashboard/oglasi/novi");
  await expect(page).toHaveURL(/\/prijava\?next=%2Fdashboard%2Foglasi%2Fnovi/);
});

test("login page is noindex and offers no registration route", async ({ page }) => {
  await page.goto("/prijava");

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );

  // There is deliberately no public sign-up anywhere in the product.
  await expect(page.getByRole("link", { name: /registracij/i })).toHaveCount(0);
  await expect(page.getByText(/administrator/i)).toBeVisible();
});

test("wrong credentials give a generic error, not user enumeration", async ({ page }) => {
  await page.goto("/prijava");

  await page.getByLabel(/e-mail/i).fill("ne-postoji@primer.rs");
  await page.getByLabel(/lozinka/i).fill("pogresna-lozinka");
  await page.getByRole("button", { name: /prijavi se/i }).click();

  // Must not distinguish "no such user" from "wrong password".
  await expect(page.getByRole("alert")).toContainText(/pogrešna/i);
});

test("registration route does not exist", async ({ page }) => {
  const response = await page.goto("/registracija");
  expect(response?.status()).toBe(404);
});
