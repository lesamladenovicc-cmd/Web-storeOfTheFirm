/**
 * dev-preview.mjs — run the storefront with no Supabase project.
 *
 *   npm run dev:preview
 *
 * Starts the mock backend in-process, then boots `next dev` pointed at
 * it. Everything public works with realistic Serbian data and generated
 * placeholder photos: homepage, search, filters, categories, listing
 * detail, gallery, contact panel, sitemap and JSON-LD.
 *
 * The dashboard is NOT included — it needs real Supabase Auth. Follow
 * the README to create a project when you want to log in.
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { start } from "./mock-supabase.mjs";

const require = createRequire(import.meta.url);

const MOCK_PORT = Number(process.env.MOCK_PORT ?? 54321);
const APP_PORT = Number(process.env.PORT ?? 3000);

console.log("\n  Preview mode — mock data, no Supabase project needed.\n");

const mock = start(MOCK_PORT);

// Resolve Next.js own JS entrypoint and run it with this Node binary.
// Spawning "npx" would mean spawning npx.cmd on Windows, which Node 20+
// refuses without a shell (EINVAL) -- and adding shell:true drags in
// quoting bugs on paths with spaces, which this project path has.
const nextBin = require.resolve("next/dist/bin/next");

const next = spawn(
  process.execPath,
  [nextBin, "dev", "--port", String(APP_PORT)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
      // Placeholders: the mock never checks them, but the app fails
      // fast on missing env by design.
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "preview-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "preview-service-role-key",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${APP_PORT}`,
    },
  },
);

const shutdown = () => {
  mock.close();
  if (!next.killed) next.kill();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
next.on("exit", (code) => {
  mock.close();
  process.exit(code ?? 0);
});
