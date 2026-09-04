"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { COPY } from "@/config/copy";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { buildCategorySlug, isValidSlug } from "@/lib/slug";
import {
  fail,
  formBool,
  formInt,
  formString,
  succeed,
  toFieldErrors,
} from "@/lib/validation/helpers";
import type { ActionState } from "@/types/domain";

/**
 * CATEGORY ADMIN.
 *
 * Uses the ordinary cookie client, not the service role: the
 * categories_write_admin RLS policy already restricts writes to admins,
 * so the database enforces this even if requireAdmin were bypassed.
 */

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: COPY.validation.required })
    .max(60, { message: COPY.validation.required }),
  slug: z.string().trim().min(2).max(60).refine(isValidSlug, { message: "Neispravna URL oznaka." }),
  description: z.string().trim().max(300).nullable(),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

function parse(formData: FormData) {
  const name = formString(formData, "name") ?? "";
  // An empty slug is derived from the name, so the admin never has to
  // think about transliteration.
  const rawSlug = formString(formData, "slug");
  const slug = rawSlug ? buildCategorySlug(rawSlug) : buildCategorySlug(name);

  return categorySchema.safeParse({
    name,
    slug,
    description: formString(formData, "description") ?? null,
    sortOrder: formInt(formData, "sortOrder") ?? 0,
    isActive: formBool(formData, "isActive"),
  });
}

export async function createCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = parse(formData);
  if (!parsed.success) {
    return fail(COPY.validation.genericError, toFieldErrors(parsed.error));
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    name: input.name,
    slug: input.slug,
    description: input.description,
    sort_order: input.sortOrder,
    is_active: input.isActive,
  });

  if (error) {
    const duplicate = error.message.toLowerCase().includes("duplicate");
    return fail(
      duplicate ? "Kategorija sa ovom URL oznakom već postoji." : COPY.validation.genericError,
    );
  }

  revalidateCategories();
  return succeed(COPY.dashboard.categories.saved);
}

export async function updateCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formString(formData, "id");
  if (!id) return fail(COPY.validation.genericError);

  const parsed = parse(formData);
  if (!parsed.success) {
    return fail(COPY.validation.genericError, toFieldErrors(parsed.error));
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name: input.name,
      slug: input.slug,
      description: input.description,
      sort_order: input.sortOrder,
      is_active: input.isActive,
    })
    .eq("id", id);

  if (error) return fail(COPY.validation.genericError);

  revalidateCategories();
  return succeed(COPY.dashboard.categories.saved);
}

/**
 * Deletes a category.
 *
 * The FK is ON DELETE RESTRICT, so a category holding listings cannot be
 * removed. That is deliberate — silently orphaning listings would be
 * worse — so the restriction is translated into an actionable Serbian
 * message pointing at deactivation instead.
 */
export async function deleteCategoryAction(categoryId: string): Promise<ActionState> {
  await requireAdmin();

  if (!/^[0-9a-f-]{36}$/i.test(categoryId)) {
    return fail(COPY.validation.genericError);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);

  if (error) {
    const restricted =
      error.code === "23503" || error.message.toLowerCase().includes("foreign key");
    return fail(restricted ? COPY.dashboard.categories.inUseError : COPY.validation.genericError);
  }

  revalidateCategories();
  return succeed();
}

export async function toggleCategoryActiveAction(
  categoryId: string,
  isActive: boolean,
): Promise<ActionState> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("id", categoryId);

  if (error) return fail(COPY.validation.genericError);

  revalidateCategories();
  return succeed();
}

/** Categories drive public navigation, filters and the sitemap. */
function revalidateCategories() {
  revalidatePath("/dashboard/admin/kategorije");
  revalidatePath("/");
  revalidatePath("/oglasi");
  revalidatePath("/sitemap.xml");
}
