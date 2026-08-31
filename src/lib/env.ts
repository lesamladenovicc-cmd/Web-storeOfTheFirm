/**
 * ENV — fail fast and loudly on misconfiguration.
 *
 * A missing Supabase URL should stop the process at boot with a clear
 * message, not surface later as an opaque "fetch failed" inside a
 * Server Component.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Nedostaje obavezna promenljiva okruženja: ${name}. ` +
        `Proverite .env.local (uzor: .env.local.example).`,
    );
  }
  return value;
}

/** Safe to expose to the browser. RLS is what protects the data. */
export const PUBLIC_ENV = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
};

/**
 * Server-only secrets. Read lazily: importing this module must not throw
 * in a context that does not need the service role.
 */
export function serverEnv() {
  return {
    serviceRoleKey: required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    inquiryIpSalt: process.env.INQUIRY_IP_SALT ?? "",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    resendFrom: process.env.RESEND_FROM_EMAIL ?? "",
  };
}
