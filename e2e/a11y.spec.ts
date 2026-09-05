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

/**
 * Exercise the reduced-motion path, which is a real user configuration
 * and the one where the staggered entrance is supposed to collapse.
 *
 * Chasing an intermittent failure here found a genuine bug: the
 * prefers-reduced-motion block zeroed animation-duration but not
 * animation-delay, and `.u-reveal` uses a delay with `backwards` fill.
 * A reduced-motion visitor therefore still waited out the full stagger
 * — about 440ms across a nine-card grid — watching content pop in.
 * Fixed in globals.css.
 */
test.use({ reducedMotion: "reduce" });

/**
 * Waits until every running animation has settled.
 *
 * axe samples computed colour at whatever opacity an element currently
 * has. Mid-fade it reports blended values — #4e220f on #161616 for a
 * price that is really #ff4d00 on #141414 — which no user ever sees and
 * which WCAG is not about. Reduced motion alone was not enough, so this
 * waits on the actual animation objects rather than on a guessed delay.
 */
async function settle(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
  });
}

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
    await settle(page);

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

/**
 * The revenue report is the densest screen in the product — a data
 * plate, a bar chart, three share tables — and the first one built
 * almost entirely out of `fg-faint` and `u-numeric` on `panel`. Those
 * are exactly the tokens the contrast table in globals.css warns about,
 * so it gets its own axe pass rather than riding on the public sweep.
 */
test("revenue report has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/prijava");
  await page.getByLabel(/e-mail/i).fill(process.env.E2E_ADMIN_EMAIL ?? "admin@jadranko.rs");
  await page.getByLabel(/lozinka/i).fill(process.env.E2E_ADMIN_PASSWORD ?? "AdminLozinka2026!");
  await page.getByRole("button", { name: /prijavi se/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/dashboard/prihod");
  await settle(page);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

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

  // The chart and its three tables are the widest things in the app;
  // each must scroll inside its own panel, not drag the page with it.
  //
  // Asserted by SCROLLING rather than by documentElement.scrollWidth,
  // which the other overflow specs use. Chrome folds the content of a
  // descendant `overflow-x: auto` box into the root's scrollWidth even
  // though that content is clipped and the viewport cannot reach it —
  // so on this page alone the proxy reports ~507px while the page does
  // not move a pixel. What matters to a phone user is whether the page
  // slides sideways under their thumb, so that is what is measured.
  await page.setViewportSize(NARROW);
  const scroll = await page.evaluate(() => {
    window.scrollTo(9999, 0);
    const reached = window.scrollX;
    window.scrollTo(0, 0);
    return {
      reached,
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });

  expect(scroll.reached).toBe(0);
  expect(scroll.bodyScrollWidth).toBeLessThanOrEqual(scroll.clientWidth + 1);

  // ...and the chart really is scrollable inside its own panel, rather
  // than silently cutting the last months off.
  const chartViewport = page
    .getByRole("region", { name: /prihod po mesecima/i })
    .locator("div")
    .first();
  const inner = await chartViewport.evaluate((el) => ({
    visible: el.clientWidth,
    content: el.scrollWidth,
  }));
  expect(inner.content).toBeGreaterThan(inner.visible);
});

test("listing detail has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/oglasi");

  // Read the href and navigate directly rather than clicking. Under
  // parallel workers the dev server can take longer to compile the
  // detail route than the default expect timeout allows, and a
  // click-then-wait races that compile. goto does not.
  const href = await page.locator("article a").first().getAttribute("href");
  expect(href).toMatch(/\/oglas\//);
  await page.goto(href!);
  await settle(page);

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
  await settle(page);

  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();

  expect(results.violations).toEqual([]);
});

test("skip link is reachable by keyboard and targets the main content", async ({ page }) => {
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
