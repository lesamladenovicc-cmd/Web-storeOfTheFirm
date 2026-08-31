/**
 * IMAGES — Supabase Storage URL helpers and client-side preprocessing.
 *
 * The `listings` bucket is public-read, so object URLs are deterministic
 * and need no signing. That is required for OG cards and for `next/image`
 * to optimise them at the edge.
 */

import { LIMITS } from "@/config/site";

export const STORAGE_BUCKET = "listings";

/**
 * Public URL for a storage path.
 * "uid/lid/abc.webp" → "https://<proj>.supabase.co/storage/v1/object/public/listings/uid/lid/abc.webp"
 */
export function publicImageUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return storagePath;
  const clean = storagePath.replace(/^\/+/, "");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${STORAGE_BUCKET}/${clean}`;
}

/**
 * 1×1 beige pixel. Used as `blurDataURL` so cards hold their layout
 * without shipping a per-image base64 placeholder.
 */
export const BLUR_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAPAAAOfeywAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

/** Storage paths are always `{sellerId}/{listingId}/{file}`. */
export function buildStoragePath(
  sellerId: string,
  listingId: string,
  fileName: string,
): string {
  return `${sellerId}/${listingId}/${fileName}`;
}

/**
 * Server-side guard: an uploaded path must live under the owner's folder
 * and this listing. Prevents a caller from attaching someone else's
 * object to their own listing.
 */
export function isOwnedStoragePath(
  storagePath: string,
  sellerId: string,
  listingId: string,
): boolean {
  const expected = `${sellerId}/${listingId}/`;
  return (
    storagePath.startsWith(expected) &&
    !storagePath.includes("..") &&
    storagePath.length > expected.length
  );
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isAllowedImageType(type: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

/* ------------------------------------------------------------------ */
/* Client-side preprocessing                                           */
/* ------------------------------------------------------------------ */

export type ProcessedImage = {
  blob: Blob;
  width: number;
  height: number;
};

/**
 * Downscales and re-encodes an image to WebP in the browser before
 * upload. Cuts typical phone-camera uploads by ~80%, which keeps us
 * inside Storage limits and well inside Vercel's image-optimisation
 * budget. Browser-only — uses createImageBitmap and canvas.
 */
export async function downscaleToWebp(
  file: File,
  maxEdge: number = LIMITS.maxImageEdge,
  quality: number = LIMITS.imageQuality,
): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas 2D context unavailable");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );

  if (!blob) throw new Error("Image encoding failed");

  return { blob, width, height };
}

/** Random object name; the extension is always .webp after processing. */
export function randomImageFileName(): string {
  return `${crypto.randomUUID()}.webp`;
}
