/**
 * seed-users.mjs — creates the two seed staff accounts.
 *
 * Supabase Auth hashes passwords and owns auth.users, so accounts cannot
 * be created from SQL. This script uses the service-role key to create
 * them, after which supabase/seed.sql can resolve the sellers by e-mail
 * and insert the mock listings.
 *
 *   node scripts/seed-users.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 * .env.local. Idempotent: existing accounts are left alone.
 *
 * The passwords printed here are for local and staging use. Change them
 * immediately on anything reachable from the internet.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal .env.local reader — avoids a dotenv dependency. */
async function loadEnv() {
  try {
    const raw = await readFile(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const [, key, value] = match;
      if (!process.env[key]) {
        process.env[key] = value.replace(/^["']|["']$/g, "").trim();
      }
    }
  } catch {
    // Fall back to the ambient environment.
  }
}

const SEED_USERS = [
  {
    email: "admin@bgbuilding.rs",
    password: "AdminLozinka2026!",
    fullName: "Administrator",
    role: "admin",
    phone: "+381641110001",
    location: "Beograd",
  },
  {
    email: "prodaja@bgbuilding.rs",
    password: "ProdajaLozinka2026!",
    fullName: "Marko Petrović",
    role: "seller",
    phone: "+381641110002",
    location: "Beograd",
  },
];

async function main() {
  await loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Copy .env.local.example to .env.local and fill them in.",
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const user of SEED_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });

    if (error) {
      if (error.message?.toLowerCase().includes("already")) {
        console.log(`  = ${user.email} already exists, skipping`);
        continue;
      }
      console.error(`  x ${user.email}: ${error.message}`);
      continue;
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: user.fullName,
        role: user.role,
        phone: user.phone,
        location: user.location,
        // Seed accounts skip the forced reset so they are usable at once.
        must_change_password: false,
      })
      .eq("id", data.user.id);

    if (profileError) {
      console.error(`  x ${user.email} profile: ${profileError.message}`);
      continue;
    }

    console.log(`  + ${user.email} (${user.role}) — password: ${user.password}`);
  }

  console.log("\nNow run supabase/seed.sql to insert the mock listings.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
