"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { COPY } from "@/config/copy";
import { isUserRole } from "@/config/taxonomy";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { fail, formString, succeed, toFieldErrors } from "@/lib/validation/helpers";
import type { ActionState } from "@/types/domain";

/**
 * ADMIN USER MANAGEMENT.
 *
 * Every action here runs on the SERVICE-ROLE client, which bypasses RLS
 * entirely. requireAdmin() is therefore not a convenience — it is the
 * only thing standing between a seller and full account control. It is
 * the first statement in every export below, without exception.
 */

const createUserSchema = z.object({
  email: z.email({ message: COPY.validation.invalidEmail }),
  fullName: z.string().trim().min(2, { message: COPY.validation.required }).max(120),
  role: z.enum(["admin", "seller"]),
});

/**
 * Ambiguity-free alphabet: no O/0, I/1/l. These passwords get read
 * aloud or copied by hand, and "did you mean O or zero" is a support
 * ticket waiting to happen.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generateTempPassword(): string {
  const groups = Array.from({ length: 3 }, () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""),
  );
  return groups.join("-");
}

/**
 * Creates an internal account with a temporary password.
 *
 * The password is returned to the admin's screen exactly once and is
 * never stored in plaintext anywhere — not in the database, not in a
 * log. must_change_password forces a reset on first login.
 */
export async function createUserAction(
  _prev: ActionState<{ email: string; password: string }>,
  formData: FormData,
): Promise<ActionState<{ email: string; password: string }>> {
  await requireAdmin();

  const parsed = createUserSchema.safeParse({
    email: formString(formData, "email"),
    fullName: formString(formData, "fullName"),
    role: formString(formData, "role") ?? "seller",
  });

  if (!parsed.success) {
    return fail(COPY.validation.genericError, toFieldErrors(parsed.error));
  }

  const { email, fullName, role } = parsed.data;
  const password = generateTempPassword();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    // No SMTP is configured, so the address cannot be verified by mail.
    // The admin vouches for it by creating the account.
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    const duplicate = error?.message?.toLowerCase().includes("already");
    return fail(
      duplicate ? "Nalog sa ovom e-mail adresom već postoji." : COPY.validation.genericError,
    );
  }

  // The handle_new_user trigger created the profile; set the fields it
  // could not know about.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: fullName, role, must_change_password: true })
    .eq("id", data.user.id);

  if (profileError) {
    // Roll back rather than leave an account with the wrong role.
    await admin.auth.admin.deleteUser(data.user.id);
    return fail(COPY.validation.genericError);
  }

  revalidatePath("/dashboard/admin/korisnici");
  return succeed(COPY.dashboard.users.tempPasswordTitle, { email, password });
}

/** Changes another user's role. Self-changes are refused. */
export async function setUserRoleAction(
  userId: string,
  role: string,
): Promise<ActionState> {
  const admin = await requireAdmin();

  if (!isUserRole(role)) return fail(COPY.validation.genericError);
  if (userId === admin.id) return fail(COPY.dashboard.users.selfEditBlocked);

  const client = createAdminClient();
  const { error } = await client.from("profiles").update({ role }).eq("id", userId);
  if (error) return fail(COPY.validation.genericError);

  revalidatePath("/dashboard/admin/korisnici");
  return succeed();
}

/**
 * Activates or deactivates an account.
 *
 * Deactivation is a soft disable, never a delete: listings, inquiries
 * and history survive. RLS reads is_active on every write policy, so
 * the effect is immediate at the database, not merely in the UI.
 *
 * An admin cannot deactivate themselves — that is the one move that can
 * lock the last administrator out of the system.
 */
export async function setUserActiveAction(
  userId: string,
  isActive: boolean,
): Promise<ActionState> {
  const admin = await requireAdmin();

  if (userId === admin.id) return fail(COPY.dashboard.users.selfEditBlocked);

  const client = createAdminClient();
  const { error } = await client
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return fail(COPY.validation.genericError);

  revalidatePath("/dashboard/admin/korisnici");
  return succeed();
}
