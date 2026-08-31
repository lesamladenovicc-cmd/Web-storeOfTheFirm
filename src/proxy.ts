import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * Layer 1 of 3. Refreshes the session cookie on every matched request
 * and turns anonymous /dashboard hits into a redirect.
 *
 * It is deliberately NOT the authorization check — it only asks "is
 * anyone signed in?". Role checks live in the dashboard layouts, and
 * the real boundary is RLS in Postgres.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/prijava";
    url.search = "";
    // Preserve the intended destination, but only as a relative path —
    // echoing an absolute URL back would be an open-redirect.
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Signed-in users have no reason to see the login form.
  if (pathname === "/prijava" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. The session must
     * be refreshed on public routes too, otherwise a visitor browsing
     * the storefront for a while is silently logged out.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)",
  ],
};
