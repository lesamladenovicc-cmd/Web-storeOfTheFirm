"use server";

import { revalidatePath } from "next/cache";
import { COPY } from "@/config/copy";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { fail, succeed } from "@/lib/validation/helpers";
import type { ActionState } from "@/types/domain";

/**
 * Marks an inquiry read. No ownership check is written here because the
 * RLS policy scopes the UPDATE to the seller (or an admin) — a foreign
 * id simply matches zero rows.
 */
export async function markInquiryReadAction(inquiryId: string): Promise<ActionState> {
  await requireProfile();

  if (!/^[0-9a-f-]{36}$/i.test(inquiryId)) {
    return fail(COPY.validation.genericError);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inquiries")
    .update({ is_read: true })
    .eq("id", inquiryId);

  if (error) return fail(COPY.validation.genericError);

  revalidatePath("/dashboard/upiti");
  revalidatePath("/dashboard", "layout");
  return succeed();
}
