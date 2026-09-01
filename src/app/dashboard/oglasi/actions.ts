"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COPY } from "@/config/copy";
import { createClient } from "@/lib/supabase/server";
import { canEditListing, requireProfile } from "@/lib/auth";
import { buildListingSlug } from "@/lib/slug";
import { isOwnedStoragePath, STORAGE_BUCKET } from "@/lib/images";
import { phoneIsUsable, schemaForStatus } from "@/lib/validation/listing";
import {
  fail,
  formBool,
  formInt,
  formString,
  formStringArray,
  succeed,
  toFieldErrors,
} from "@/lib/validation/helpers";
import type { ActionState } from "@/types/domain";

/**
 * LISTING ACTIONS.
 *
 * Ownership is re-checked here even though RLS already enforces it. The
 * database is the boundary; this layer exists so a mistake produces a
 * Serbian error message instead of an opaque policy violation.
 */

type ParsedForm = {
  ok: true;
  values: Record<string, unknown>;
  status: string;
} | {
  ok: false;
  state: ActionState;
};

function parseListingForm(formData: FormData): ParsedForm {
  const status = formString(formData, "status") ?? "nacrt";

  const rawPhone = formString(formData, "contactPhone") ?? null;
  if (!phoneIsUsable(rawPhone)) {
    return {
      ok: false,
      state: fail(COPY.validation.genericError, {
        contactPhone: COPY.validation.invalidPhone,
      }),
    };
  }

  const price = formInt(formData, "priceRsd");
  if (price !== undefined && Number.isNaN(price)) {
    return {
      ok: false,
      state: fail(COPY.validation.genericError, {
        priceRsd: COPY.validation.invalidPrice,
      }),
    };
  }

  return {
    ok: true,
    status,
    values: {
      title: formString(formData, "title") ?? "",
      description: formString(formData, "description") ?? "",
      condition: formString(formData, "condition"),
      priceRsd: price ?? null,
      isNegotiable: formBool(formData, "isNegotiable"),
      location: formString(formData, "location") ?? "",
      categoryId: formString(formData, "categoryId") ?? null,
      contactName: formString(formData, "contactName") ?? "",
      contactPhone: rawPhone,
      contactEmail: formString(formData, "contactEmail") ?? null,
      imagePaths: formStringArray(formData, "imagePaths"),
      status,
    },
  };
}

/** Rejects any image path not under {sellerId}/{listingId}/. */
function imagePathsAreOwned(
  paths: string[],
  sellerId: string,
  listingId: string,
): boolean {
  return paths.every((p) => isOwnedStoragePath(p, sellerId, listingId));
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

export async function createListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  // The client generates the id up front so images can be uploaded to
  // {sellerId}/{listingId}/ before the row exists.
  const listingId = formString(formData, "listingId");
  if (!listingId || !/^[0-9a-f-]{36}$/i.test(listingId)) {
    return fail(COPY.validation.genericError);
  }

  const parsed = parseListingForm(formData);
  if (!parsed.ok) return parsed.state;

  const result = schemaForStatus(parsed.status).safeParse(parsed.values);
  if (!result.success) {
    return fail(COPY.validation.genericError, toFieldErrors(result.error));
  }
  const input = result.data;

  if (!imagePathsAreOwned(input.imagePaths, profile.id, listingId)) {
    return fail(COPY.validation.unauthorized);
  }

  const supabase = await createClient();
  const slug = buildListingSlug(input.title);

  const { error } = await supabase.from("listings").insert({
    id: listingId,
    slug,
    title: input.title,
    description: input.description,
    condition: input.condition,
    price_rsd: input.priceRsd,
    is_negotiable: input.isNegotiable,
    status: input.status,
    location: input.location,
    category_id: input.categoryId,
    seller_id: profile.id,
    contact_name: input.contactName,
    contact_phone: input.contactPhone,
    contact_email: input.contactEmail,
    cover_image_path: input.imagePaths[0] ?? null,
  });

  if (error) return fail(COPY.validation.genericError);

  if (input.imagePaths.length > 0) {
    const { error: imgError } = await supabase.from("listing_images").insert(
      input.imagePaths.map((path, i) => ({
        listing_id: listingId,
        storage_path: path,
        alt: input.title,
        sort_order: i,
      })),
    );
    // The listing exists; a failed image insert must not lose it.
    if (imgError) {
      revalidateListing(slug);
      return fail(COPY.dashboard.form.imageFailed);
    }
  }

  revalidateListing(slug);
  redirect(`/dashboard/oglasi/${listingId}/izmena?sacuvano=1`);
}

/* ------------------------------------------------------------------ */
/* Update                                                              */
/* ------------------------------------------------------------------ */

export async function updateListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  const listingId = formString(formData, "listingId");
  if (!listingId) return fail(COPY.validation.genericError);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("listings")
    .select("id, slug, seller_id, status")
    .eq("id", listingId)
    .maybeSingle();

  if (!existing) return fail(COPY.validation.genericError);

  const current = existing as {
    id: string;
    slug: string;
    seller_id: string;
    status: string;
  };

  if (!canEditListing(profile, current.seller_id)) {
    return fail(COPY.validation.unauthorized);
  }

  const parsed = parseListingForm(formData);
  if (!parsed.ok) return parsed.state;

  const result = schemaForStatus(parsed.status).safeParse(parsed.values);
  if (!result.success) {
    return fail(COPY.validation.genericError, toFieldErrors(result.error));
  }
  const input = result.data;

  if (!imagePathsAreOwned(input.imagePaths, current.seller_id, listingId)) {
    return fail(COPY.validation.unauthorized);
  }

  /**
   * The slug is regenerated ONLY while the listing is still a draft.
   * Once published, the URL is canonical, indexed and possibly linked —
   * changing it on a title edit would 404 every inbound link.
   */
  const slug =
    current.status === "nacrt" && input.status !== "nacrt"
      ? buildListingSlug(input.title)
      : current.slug;

  const { error } = await supabase
    .from("listings")
    .update({
      slug,
      title: input.title,
      description: input.description,
      condition: input.condition,
      price_rsd: input.priceRsd,
      is_negotiable: input.isNegotiable,
      status: input.status,
      location: input.location,
      category_id: input.categoryId,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      contact_email: input.contactEmail,
      cover_image_path: input.imagePaths[0] ?? null,
    })
    .eq("id", listingId);

  if (error) return fail(COPY.validation.genericError);

  await syncImages(listingId, input.imagePaths, input.title);

  revalidateListing(slug);
  if (slug !== current.slug) revalidateListing(current.slug);

  return succeed(COPY.dashboard.form.updated);
}

/**
 * Replaces the image set with exactly the submitted paths, preserving
 * order. Rows are diffed rather than deleted-and-reinserted so that
 * unchanged images keep their ids.
 */
async function syncImages(listingId: string, paths: string[], alt: string) {
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("listing_images")
    .select("id, storage_path")
    .eq("listing_id", listingId);

  const existing = (current ?? []) as { id: string; storage_path: string }[];
  const keep = new Set(paths);

  const toDelete = existing.filter((row) => !keep.has(row.storage_path));
  if (toDelete.length > 0) {
    await supabase
      .from("listing_images")
      .delete()
      .in("id", toDelete.map((r) => r.id));
    // Best-effort: an orphaned object costs storage, not correctness.
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(toDelete.map((r) => r.storage_path));
  }

  const known = new Map(existing.map((r) => [r.storage_path, r.id]));

  for (const [index, path] of paths.entries()) {
    const id = known.get(path);
    if (id) {
      await supabase.from("listing_images").update({ sort_order: index }).eq("id", id);
    } else {
      await supabase.from("listing_images").insert({
        listing_id: listingId,
        storage_path: path,
        alt,
        sort_order: index,
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Status shortcuts                                                    */
/* ------------------------------------------------------------------ */

export async function setListingStatusAction(
  listingId: string,
  status: "nacrt" | "aktivan" | "prodato",
): Promise<ActionState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("listings")
    .select("id, slug, seller_id")
    .eq("id", listingId)
    .maybeSingle();

  if (!existing) return fail(COPY.validation.genericError);
  const row = existing as { slug: string; seller_id: string };

  if (!canEditListing(profile, row.seller_id)) {
    return fail(COPY.validation.unauthorized);
  }

  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId);

  // The publish CHECK constraints can legitimately reject this.
  if (error) return fail(COPY.validation.genericError);

  revalidateListing(row.slug);
  return succeed(COPY.dashboard.form.updated);
}

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

export async function deleteListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireProfile();

  const listingId = formString(formData, "listingId");
  const confirmation = formString(formData, "confirmTitle") ?? "";
  if (!listingId) return fail(COPY.validation.genericError);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("listings")
    .select("id, slug, title, seller_id")
    .eq("id", listingId)
    .maybeSingle();

  if (!existing) return fail(COPY.validation.genericError);
  const row = existing as {
    id: string;
    slug: string;
    title: string;
    seller_id: string;
  };

  if (!canEditListing(profile, row.seller_id)) {
    return fail(COPY.validation.unauthorized);
  }

  // Typing the title is the guard against an accidental destructive click.
  if (confirmation.trim() !== row.title.trim()) {
    return fail(COPY.dashboard.delete.mismatch, {
      confirmTitle: COPY.dashboard.delete.mismatch,
    });
  }

  // Collect object paths before the cascade removes the rows.
  const { data: images } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", listingId);

  const { error } = await supabase.from("listings").delete().eq("id", listingId);
  if (error) return fail(COPY.validation.genericError);

  const paths = ((images ?? []) as { storage_path: string }[]).map((i) => i.storage_path);
  if (paths.length > 0) {
    // Best-effort. A storage failure must not resurrect the listing.
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  }

  revalidateListing(row.slug);
  redirect("/dashboard/oglasi?obrisano=1");
}

/* ------------------------------------------------------------------ */

/**
 * On-demand revalidation so an edit is visible immediately rather than
 * after the 1-hour ISR window.
 */
function revalidateListing(slug: string) {
  revalidatePath(`/oglas/${slug}`);
  revalidatePath("/oglasi");
  revalidatePath("/");
  revalidatePath("/dashboard/oglasi");
  revalidatePath("/sitemap.xml");
}
