"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, safeRedirectPath } from "@/lib/validation/auth";
import { fail, toFieldErrors } from "@/lib/validation/helpers";
import { COPY } from "@/config/copy";
import type { ActionState } from "@/types/domain";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return fail(COPY.auth.genericError, toFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    // Deliberately generic: distinguishing "no such user" from "wrong
    // password" hands an attacker a user-enumeration oracle.
    return fail(COPY.auth.invalidCredentials);
  }

  // A deactivated account must not hold a session, even briefly.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return fail(COPY.auth.inactiveAccount);
  }

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(formData.get("next") as string | null));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/prijava");
}
