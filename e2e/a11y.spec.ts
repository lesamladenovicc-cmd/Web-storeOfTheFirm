import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility and responsive checks.
 *
 * These exist because the plan's a11y and 360px passes were the two
 * items most likely to be waved through as "looks fine". axe measures
 * contrast for real, which also settles the open question about the
 * accent colour: #FF4D00 on #141414 computes to 5.63:1, but the only
 * trustworthy check is the rendered page.
 */

const PUBLIC_ROUTES = [
  { path: "/", name: "homepage" },
  { path: "/oglasi", name: "listing index" },
  { path: "/o-nama", name: "about" },
  { path: "/kontakt", name: "contact" },
  { path: "/prijava", name: "login" },
];

for (const route of PUBLIC_ROUTES) {
  test(`${route.name} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route.path);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // Print the rule and the offending node so a failure is actionable
    // rather than just a count.
    if (results.violations.length > 0) {
      console.error(
        results.violations
          .map(
            (v) =>
              `${v.id} (${v.impact}): ${v.help}\n  ` +
              v.nodes.map((n) => n.target.join(" ")).join("\n  "),
          )
          .join("\n"),
      );
    }

    expect(results.violations).toEqual([]);
  });
}

test("listing detail has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/oglasi");

  // Read the href and navigate directly rather than clicking. Under
  // parallel workers the dev server can take longer to compile the
  // detail route than the default expect timeout allows, and a
  // click-then-wait races that compile. goto does not.
  const href = await page.locator("article a").first().getAttribute("href");
  expect(href).toMatch(/\/oglas\//);
  await page.goto(href!);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  if (results.violations.length > 0) {
    console.error(results.violations.map((v) => `${v.id}: ${v.help}`).join("\n"));
  }
  expect(results.violations).toEqual([]);
});

/**
 * The accent is the one token with a real risk of failing AA — it is
 * used for primary buttons and prices. This isolates the contrast rule
 * so a regression names the cause instead of hiding in a generic count.
 */
test("accent colour passes contrast where it is used as text", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page })
    .withRules(["color-contrast"])
    .analyze();

  expect(results.violations).toEqual([]);
});

test("skip link is reachable by keyboard and targets the main content", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skip = page.getByRole("link", { name: /pređi na sadržaj/i });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute("href", "#sadrzaj");

  await expect(page.locator("#sadrzaj")).toHaveCount(1);
});

/**
 * 360px is the narrowest phone worth supporting. A page that scrolls
 * horizontally there is broken, and it is the single most common
 * responsive regression.
 */
const NARROW = { width: 360, height: 780 };

for (const route of [...PUBLIC_ROUTES.map((r) => r.path), "/kategorija/gradjevinske-masine"]) {
  test(`no horizontal overflow at 360px on ${route}`, async ({ page }) => {
    await page.setViewportSize(NARROW);
    await page.goto(route);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      };
    });

    // A 1px rounding tolerance; anything more is a real layout break.
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
}

test("listing detail does not overflow at 360px", async ({ page }) => {
  await page.setViewportSize(NARROW);
  await page.goto("/oglasi");

  const href = await page.locator("article a").first().getAttribute("href");
  await page.goto(href!);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
});
