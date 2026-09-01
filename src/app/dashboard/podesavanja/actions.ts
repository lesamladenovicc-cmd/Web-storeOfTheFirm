"use server";

import { revalidatePath } from "next/cache";
import { COPY } from "@/config/copy";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { fail, formString, succeed } from "@/lib/validation/helpers";
import type { ActionState } from "@/types/domain";

/**
 * Updates the signed-in user's own profile.
 *
 * Only name, phone and location are written. Role and is_active are not
 * accepted here at all, and the guard_profile_privileges trigger rejects
 * them even if a request smuggled them past this function.
 */
export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  const fullName = formString(formData, "fullName") ?? "";
  const rawPhone = formString(formData, "phone");
  const location = formString(formData, "location") ?? null;

  if (fullName.length > 120) return fail(COPY.validation.genericError);
  if (location && location.length > 80) {
    return fail(COPY.validation.genericError, { location: COPY.validation.locationLength });
  }

  let phone: string | null = null;
  if (rawPhone) {
    phone = normalizePhone(rawPhone);
    if (!phone) {
      return fail(COPY.validation.genericError, { phone: COPY.validation.invalidPhone });
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone, location })
    .eq("id", profile.id);

  if (error) return fail(COPY.validation.genericError);

  revalidatePath("/dashboard", "layout");
  return succeed(COPY.dashboard.settings.saved);
}
