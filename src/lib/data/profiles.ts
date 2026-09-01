import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

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
 * All staff accounts. Uses the cookie client, so RLS returns every row
 * only when the caller is an admin — a seller calling this gets exactly
 * their own record back, not an error.
 */
export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, location, role, is_active, must_change_password, created_at",
    )
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as ProfileRow[]).map(toProfile);
}
