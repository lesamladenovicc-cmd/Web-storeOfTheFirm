import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_ENV } from "@/lib/env";

/**
 * Refreshes the auth cookie and reports who is signed in.
 *
 * The response object must be threaded through exactly as written:
 * @supabase/ssr rewrites cookies during token refresh, and returning a
 * different NextResponse instance silently drops the refreshed session,
 * logging users out at random intervals.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    PUBLIC_ENV.supabaseUrl,
    PUBLIC_ENV.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates the token with the auth server. getSession()
  // only decodes the cookie and must not be trusted for authorization.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
