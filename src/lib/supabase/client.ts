"use client";

import { createBrowserClient } from "@supabase/ssr";
import { PUBLIC_ENV } from "@/lib/env";

/**
 * Browser client. Used for two things only:
 *  - direct image uploads to Storage (keeps multi-MB bodies off the
 *    Next.js server and out of Server Action body limits)
 *  - reading the current session in client components
 *
 * All data mutations go through Server Actions, never through this.
 */
export function createClient() {
  return createBrowserClient(PUBLIC_ENV.supabaseUrl, PUBLIC_ENV.supabaseAnonKey);
}
