import type { NextConfig } from "next";

/**
 * Supabase Storage host is derived from the project URL so that image
 * optimisation keeps working across local / preview / production projects
 * without editing this file.
 */
const supabaseImageHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return {
      // Derived from the URL rather than hardcoded to https, so the
      // local preview (http://127.0.0.1) works exactly like production.
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      ...(parsed.port ? { port: parsed.port } : {}),
    };
  } catch {
    return undefined;
  }
})();

/**
 * True only when Supabase points at localhost — i.e. `npm run dev:preview`
 * against scripts/mock-supabase.mjs.
 *
 * Next refuses to optimise images from private IPs as SSRF protection,
 * which is the correct default. Deriving the exception from the URL
 * rather than exposing a manual flag means a real deployment (a
 * *.supabase.co host) can never accidentally turn it on.
 */
const isLocalSupabase =
  supabaseImageHost?.hostname === "127.0.0.1" ||
  supabaseImageHost?.hostname === "localhost";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root; otherwise Turbopack walks up and finds an
  // unrelated package-lock.json in the user's home directory.
  turbopack: { root: import.meta.dirname },
  // Playwright drives the dev server over 127.0.0.1; without this Next
  // logs a cross-origin warning on every request.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    formats: ["image/avif", "image/webp"],
    ...(isLocalSupabase ? { dangerouslyAllowLocalIP: true } : {}),
    remotePatterns: supabaseImageHost
      ? [{ ...supabaseImageHost, pathname: "/storage/v1/object/public/**" }]
      : [
          {
            protocol: "https",
            hostname: "*.supabase.co",
            pathname: "/storage/v1/object/public/**",
          },
        ],
  },
};

export default nextConfig;
