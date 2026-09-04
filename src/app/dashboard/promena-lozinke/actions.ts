"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COPY } from "@/config/copy";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation/auth";
import { fail, toFieldErrors } from "@/lib/validation/helpers";
import type { ActionState } from "@/types/domain";

/**
 * Sets a new password and clears must_change_password.
 *
 * requireProfile is called with allowPasswordChange so it does not
 * redirect back into this page and loop.
 */
export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile({ allowPasswordChange: true });

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });

  if (!parsed.success) {
    return fail(COPY.validation.genericError, toFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(COPY.validation.genericError);

  // The flag is on the profile, not on auth.users, so clear it here.
  await supabase.from("profiles").update({ must_change_password: false }).eq("id", profile.id);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
