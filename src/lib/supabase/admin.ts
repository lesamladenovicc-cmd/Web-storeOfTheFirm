import "server-only";

import { createClient } from "@supabase/supabase-js";
import { PUBLIC_ENV, serverEnv } from "@/lib/env";

/**
 * SERVICE-ROLE CLIENT — BYPASSES ROW LEVEL SECURITY.
 *
 * `import "server-only"` makes bundling this into a client component a
 * build error rather than a silent key leak.
 *
 * Legitimate uses, and no others:
 *   1. Admin user management (auth.admin.createUser, role changes).
 *   2. Inserting inquiries from anonymous visitors, after zod
 *      validation + honeypot + rate limiting. anon has no INSERT policy
 *      on that table precisely so this is the only path in.
 *
 * Every call site must do its own authorization check first. There is
 * no database safety net behind this client.
 */
export function createAdminClient() {
  const { serviceRoleKey } = serverEnv();

  return createClient(PUBLIC_ENV.supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
