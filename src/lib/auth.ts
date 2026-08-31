import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

/**
 * AUTH — server-side session and role helpers.
 *
 * These produce good redirects and error messages. They are NOT the
 * security boundary: RLS is. Every helper here assumes it can be
 * bypassed and is backed by a policy that cannot.
 */

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  location: string | null;
  role: "admin" | "seller";
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
};

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    location: row.location,
    role: row.role,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    createdAt: row.created_at,
  };
}

/**
 * Current user, or null. `cache` dedupes this across a single render
 * pass so a layout and its pages share one round trip.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Current user's profile, or null when signed out. */
export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, location, role, is_active, must_change_password, created_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return toProfile(data as ProfileRow);
});

/** True when someone is signed in — cheap check for the site header. */
export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

/**
 * Gate for every /dashboard route.
 *
 * Redirect order matters:
 *   1. not signed in        → /prijava
 *   2. deactivated account  → /prijava with a message (session is killed)
 *   3. temporary password   → forced password change
 */
export async function requireProfile(options?: {
  /** Set on the password-change route itself to avoid a redirect loop. */
  allowPasswordChange?: boolean;
}): Promise<Profile> {
  const profile = await getSessionProfile();

  if (!profile) redirect("/prijava");

  if (!profile.isActive) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/prijava?greska=deaktiviran");
  }

  if (profile.mustChangePassword && !options?.allowPasswordChange) {
    redirect("/dashboard/promena-lozinke");
  }

  return profile;
}

/**
 * Admin-only gate. Returns 404 rather than 403 so the route's existence
 * is not confirmed to a non-admin.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return profile;
}

/** Ownership check for actions. RLS enforces this too; this is for UX. */
export function canEditListing(profile: Profile, sellerId: string): boolean {
  return profile.role === "admin" || profile.id === sellerId;
}
