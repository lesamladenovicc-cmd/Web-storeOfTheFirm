import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config.
 *
 * Assumes a reachable Supabase project with the migrations and seed
 * applied (see README). Specs tagged @seed depend on the seeded staff
 * accounts; the rest only need the public storefront to render.
 */
// `||`, not `??`: an exported-but-empty PLAYWRIGHT_BASE_URL is not
// nullish, and `??` would happily hand Playwright an empty baseURL,
// failing every spec with an opaque "Invalid URL".
const PORT = Number(process.env.PLAYWRIGHT_PORT || 3100);
const EXTERNAL_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "";
const BASE_URL = EXTERNAL_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,

  /**
   * ONE WORKER, ALWAYS — the backend is a single shared database.
   *
   * seller.spec and revenue.spec both POST /__reset in beforeEach to
   * restore fixtures, and scripts/mock-supabase.mjs holds one in-memory
   * store for the whole process. Run in parallel, one file's reset wipes
   * the state another file is mid-assertion on, and the failures land on
   * whichever spec happened to lose the race — they look like real
   * regressions and are not.
   *
   * Each suite passes on its own; only the sharing is broken. Isolating
   * per worker would mean a database per connection in the mock, which
   * is a lot of machinery to buy back roughly thirty seconds.
   */
  workers: 1,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    locale: "sr-RS",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Reuse an already-running dev server locally; boot one in CI.
  webServer: EXTERNAL_BASE_URL
    ? undefined
    : {
        command: `npx next dev --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
