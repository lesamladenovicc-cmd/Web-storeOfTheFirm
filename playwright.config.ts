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
  workers: process.env.CI ? 1 : undefined,
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
