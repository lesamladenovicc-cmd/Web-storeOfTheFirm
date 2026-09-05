import { expect, test } from "@playwright/test";

/**
 * The off-canvas menu, measured against the VIEWPORT.
 *
 * This exists because of a bug that every functional assertion missed:
 * the trigger worked, `aria-expanded` flipped, the links were in the
 * DOM and clickable by Playwright — and a real phone user saw a 64px
 * sliver under the header with the whole menu clipped away.
 *
 * The cause was `backdrop-blur-md` on SiteHeader. A backdrop-filter
 * makes its element a containing block for `position: fixed`
 * descendants, so the drawer's `fixed inset-y-0` resolved against the
 * header's own box rather than the viewport. MobileNav now portals the
 * overlay to <body>; these assertions fail again the moment it stops.
 */
test.use({ viewport: { width: 390, height: 844 } });

test("the drawer fills the viewport, not the header's box", async ({ page }) => {
  await page.goto("/");

  const drawer = page.locator("#mobile-nav");
  await expect(drawer).toBeHidden();

  await page.getByRole("button", { name: /otvori meni/i }).click();
  await expect(drawer).toBeVisible();

  // The real assertion: full height, pinned to the right edge.
  const box = await drawer.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(844);
  expect(box!.y).toBeLessThanOrEqual(0);
  expect(Math.round(box!.x + box!.width)).toBe(390);

  // Escaping the header's subtree is the mechanism, so assert it too:
  // a future refactor that re-nests the overlay fails here by name.
  const parentIsBody = await drawer.evaluate((el) => el.parentElement === document.body);
  expect(parentIsBody).toBe(true);
});

test("every nav link is inside the viewport, and following one closes the menu", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /otvori meni/i }).click();

  const links = page.locator("#mobile-nav nav a");
  const count = await links.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const box = await links.nth(i).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  }

  /**
   * Closing is asserted through a link rather than the trigger: while the
   * drawer is open it covers the header, so the hamburger underneath it
   * is deliberately unreachable. This is also the path the component is
   * actually built around — `open` is derived from the route it was
   * opened on, so navigating closes the menu with no effect at all.
   */
  await links.filter({ hasText: /o nama/i }).click();
  await expect(page).toHaveURL(/\/o-nama$/);
  await expect(page.locator("#mobile-nav")).toBeHidden();
});

test("the backdrop closes the menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /otvori meni/i }).click();
  await expect(page.locator("#mobile-nav")).toBeVisible();

  /**
   * `body > button` IS the assertion that the portal landed: the
   * backdrop is only a direct child of <body> because it was portalled
   * out of the header. Matching it by role alone would also match the
   * hamburger, which sits under the drawer and is not clickable.
   *
   * The drawer is 340px wide against a 390px viewport, so only the
   * left-hand strip of the backdrop is actually hittable.
   */
  const backdrop = page.locator('body > button[aria-label="Zatvori meni"]');
  await expect(backdrop).toBeVisible();
  await backdrop.click({ position: { x: 20, y: 400 } });

  await expect(page.locator("#mobile-nav")).toBeHidden();
});

test("Escape closes the menu and restores page scrolling", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /otvori meni/i }).click();
  await expect(page.locator("#mobile-nav")).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-nav")).toBeHidden();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});
