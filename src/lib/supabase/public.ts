import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PUBLIC_ENV } from "@/lib/env";

/**
 * Session-less anon client for the PUBLIC read path.
 *
 * Two reasons this exists rather than reusing the cookie-based client:
 *
 *  1. Correctness. Reading cookies opts a route out of static
 *     generation, so every public page would become per-request
 *     dynamic and the whole ISR/SEO strategy would silently collapse.
 *     generateStaticParams() and sitemap() go further and hard-error,
 *     since they run at build time with no HTTP request at all.
 *
 *  2. Semantics. Public pages should render exactly what the public
 *     sees. Running as `anon` means RLS restricts these reads to active
 *     listings and active categories by construction — a signed-in
 *     seller cannot accidentally be served their own draft from a
 *     shared CDN cache.
 *
 * Dashboard reads use the cookie client instead; they need the session.
 */
export function createPublicClient() {
  return createSupabaseClient(PUBLIC_ENV.supabaseUrl, PUBLIC_ENV.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
