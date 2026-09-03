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

/**
 * What the bytes actually are, regardless of the file name.
 *
 * `File.type` is derived from the extension by the OS, so it lies
 * routinely: an iPhone photo transferred to Windows is commonly HEIC
 * bytes under an IMG_1234.JPG name, which Windows reports as
 * image/jpeg. Trusting that let the file past the type check and it
 * then failed deep inside createImageBitmap, where no browser can
 * decode HEIC.
 */
export type SniffedFormat = "jpeg" | "png" | "webp" | "gif" | "heic" | "avif" | "unknown";

export async function sniffImageFormat(file: Blob): Promise<SniffedFormat> {
  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const at = (offset: number, ...bytes: number[]) =>
    bytes.every((b, i) => head[offset + i] === b);
  const ascii = (offset: number, text: string) =>
    at(offset, ...[...text].map((c) => c.charCodeAt(0)));

  if (at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  if (ascii(0, "GIF8")) return "gif";

  // ISO-BMFF: the brand at offset 8 says which flavour of the container.
  if (ascii(4, "ftyp")) {
    if (ascii(8, "avif") || ascii(8, "avis")) return "avif";
    for (const brand of ["heic", "heix", "heim", "heis", "hevc", "mif1", "msf1"]) {
      if (ascii(8, brand)) return "heic";
    }
  }

  return "unknown";
}

/** Sniffed formats the upload pipeline can actually decode and re-encode. */
export function isDecodableFormat(format: SniffedFormat): boolean {
  return format === "jpeg" || format === "png" || format === "webp";
}

/* ------------------------------------------------------------------ */
/* Client-side preprocessing                                           */
/* ------------------------------------------------------------------ */

/** Encodings we may upload. Both are allowed by the bucket in 0008. */
export type UploadEncoding = {
  contentType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
};

const WEBP: UploadEncoding = { contentType: "image/webp", extension: "webp" };
const JPEG: UploadEncoding = { contentType: "image/jpeg", extension: "jpg" };

export type ProcessedImage = {
  blob: Blob;
  width: number;
  height: number;
  encoding: UploadEncoding;
};

/**
 * Downscales and re-encodes an image in the browser before upload. Cuts
 * typical phone-camera uploads by ~80%, which keeps us inside Storage
 * limits and well inside Vercel's image-optimisation budget.
 * Browser-only — uses createImageBitmap and canvas.
 *
 * WebP is preferred, but `toBlob` yields null on browsers that cannot
 * encode it, so JPEG is the fallback. The chosen encoding is returned
 * rather than assumed: the object's extension and its upload
 * content-type must agree, or the bucket rejects the write and
 * next/image later refuses to optimise it.
 *
 * Errors are technical and English on purpose — they are logged for a
 * developer, never shown raw. User-facing copy lives in COPY.
 */
export async function downscaleForUpload(
  file: File,
  maxEdge: number = LIMITS.maxImageEdge,
  quality: number = LIMITS.imageQuality,
): Promise<ProcessedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (cause) {
    throw new Error(
      `Browser could not decode ${file.type || "unknown type"} (${file.name})`,
      { cause },
    );
  }

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

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  let encoding = WEBP;
  let blob = await encode(WEBP.contentType);

  // Older Safari resolves null instead of rejecting for WebP.
  if (!blob) {
    encoding = JPEG;
    blob = await encode(JPEG.contentType);
  }

  if (!blob) throw new Error("Canvas produced no blob for WebP or JPEG");

  // Chromium silently substitutes PNG when asked for a type it cannot
  // encode, which would upload PNG bytes under a .webp name. Trust what
  // came back, not what was requested.
  if (blob.type === WEBP.contentType) encoding = WEBP;
  else if (blob.type === JPEG.contentType) encoding = JPEG;
  else throw new Error(`Canvas encoded unexpected type ${blob.type || "(none)"}`);

  return { blob, width, height, encoding };
}

/** Random object name; the extension must match the upload's type. */
export function randomImageFileName(extension: UploadEncoding["extension"]): string {
  return `${crypto.randomUUID()}.${extension}`;
}
