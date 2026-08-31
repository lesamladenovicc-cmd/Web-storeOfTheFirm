import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PUBLIC_ENV } from "@/lib/env";

/**
 * Request-scoped Supabase client carrying the user's session cookie.
 * Runs as `authenticated` (or `anon`), so RLS applies — this is the
 * client every page and action should use.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(PUBLIC_ENV.supabaseUrl, PUBLIC_ENV.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Harmless: middleware.ts refreshes the session on every
          // request, so the cookie is never left stale.
        }
      },
    },
  });
}
