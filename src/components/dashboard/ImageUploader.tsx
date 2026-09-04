"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { COPY } from "@/config/copy";
import { LIMITS } from "@/config/site";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import {
  STORAGE_BUCKET,
  buildStoragePath,
  downscaleForUpload,
  isDecodableFormat,
  publicImageUrl,
  randomImageFileName,
  sniffImageFormat,
} from "@/lib/images";

/**
 * Uploads images DIRECTLY from the browser to Supabase Storage.
 *
 * Deliberately not routed through a Server Action: multi-megabyte photo
 * uploads would hit Server Action body limits and burn Vercel function
 * bandwidth. The browser holds the seller's JWT, and the storage policy
 * constrains writes to the {auth.uid()}/… prefix, so this is safe.
 *
 * Each file is downscaled and re-encoded to WebP before upload, which
 * typically removes ~80% of a phone-camera photo's bytes.
 *
 * Failures are PER FILE and retryable — one bad photo must never lose
 * the rest of the form.
 */

export type UploadedImage = {
  /** Stable key for React; not persisted. */
  key: string;
  path: string;
  status: "uploading" | "done" | "error";
  previewUrl?: string;
  /** Technical reason, shown on hover and logged. Never localised. */
  reason?: string;
};

export function ImageUploader({
  sellerId,
  listingId,
  value,
  onChange,
}: {
  sellerId: string;
  listingId: string;
  value: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadOne = useCallback(
    async (file: File, key: string) => {
      const supabase = createClient();
      try {
        const { blob, encoding } = await downscaleForUpload(file);
        const path = buildStoragePath(sellerId, listingId, randomImageFileName(encoding.extension));

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, blob, {
            contentType: encoding.contentType,
            upsert: false,
          });

        if (uploadError) throw uploadError;
        return { path, ok: true as const };
      } catch (error) {
        // Swallowing this silently made a failed upload undiagnosable —
        // the UI said only "Otpremanje nije uspelo" and nothing reached
        // the console. The cause is kept for the tile and logged.
        const reason = error instanceof Error ? error.message : String(error);
        console.error(`Upload failed for ${file.name}:`, error);
        return { path: "", ok: false as const, key, reason };
      }
    },
    [sellerId, listingId],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const incoming = Array.from(files);

      if (value.length + incoming.length > LIMITS.maxImages) {
        setError(COPY.validation.tooManyImages);
        return;
      }

      const accepted: { file: File; key: string }[] = [];
      for (const file of incoming) {
        // The bytes decide, not the name. An iPhone photo arrives as
        // HEIC under a .JPG name, which the OS reports as image/jpeg —
        // it would pass a File.type check and then fail undecodably.
        const format = await sniffImageFormat(file);

        if (format === "heic") {
          setError(COPY.validation.imageHeic);
          continue;
        }
        if (!isDecodableFormat(format)) {
          setError(COPY.validation.imageWrongType);
          continue;
        }
        if (file.size > LIMITS.maxImageBytes) {
          setError(COPY.validation.imageTooLarge);
          continue;
        }
        accepted.push({ file, key: crypto.randomUUID() });
      }
      if (accepted.length === 0) return;

      // Optimistic placeholders so the grid does not jump on completion.
      const placeholders: UploadedImage[] = accepted.map(({ file, key }) => ({
        key,
        path: "",
        status: "uploading",
        previewUrl: URL.createObjectURL(file),
      }));
      let current = [...value, ...placeholders];
      onChange(current);

      for (const { file, key } of accepted) {
        const result = await uploadOne(file, key);
        current = current.map((img) =>
          img.key === key
            ? result.ok
              ? { ...img, path: result.path, status: "done" as const }
              : { ...img, status: "error" as const, reason: result.reason }
            : img,
        );
        onChange(current);
        // Surface the cause where it is actually read. The per-tile
        // label is too small for a reason, and expecting a seller to
        // open DevTools is not a diagnosis path.
        if (!result.ok && result.reason) {
          setError(`${COPY.dashboard.form.imageFailed}: ${result.reason}`);
        }
      }
    },
    [value, onChange, uploadOne],
  );

  const remove = (key: string) => {
    // The storage object is reaped by the save action's image diff, so
    // removing here only detaches it from the form.
    onChange(value.filter((img) => img.key !== key));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    onChange(next);
  };

  const makeCover = (index: number) => {
    if (index === 0) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    if (item) next.unshift(item);
    onChange(next);
  };

  return (
    <div>
      {/* The saved value: one hidden input per path, in display order. */}
      {value
        .filter((img) => img.status === "done" && img.path)
        .map((img) => (
          <input key={img.key} type="hidden" name="imagePaths" value={img.path} />
        ))}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-md border border-dashed p-6 text-center transition-colors",
          dragging ? "border-accent bg-accent-soft" : "border-line",
        )}
      >
        <p className="text-fg-muted text-sm">{COPY.dashboard.form.imagesDrop}</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border-line-strong text-fg hover:border-accent hover:text-accent-text mt-3 inline-flex h-9 items-center rounded-sm border px-4 text-sm transition-colors"
        >
          {COPY.dashboard.form.imagesAdd}
        </button>
        <p className="text-fg-faint mt-3 text-xs">{COPY.dashboard.form.imagesHint}</p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error ? <p className="text-danger mt-2 text-sm">{error}</p> : null}

      {value.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {value.map((img, i) => (
            <li
              key={img.key}
              className={cn(
                "bg-panel relative overflow-hidden rounded-sm border",
                i === 0 ? "border-accent" : "border-line",
              )}
            >
              <div className="relative aspect-square">
                {img.previewUrl || img.path ? (
                  <Image
                    src={img.previewUrl ?? publicImageUrl(img.path)}
                    alt=""
                    fill
                    sizes="200px"
                    unoptimized={Boolean(img.previewUrl)}
                    className={cn("object-cover", img.status !== "done" && "opacity-45")}
                  />
                ) : null}

                {img.status === "uploading" ? (
                  <span className="text-fg absolute inset-0 grid place-items-center text-xs">
                    {COPY.dashboard.form.imageUploading}
                  </span>
                ) : null}

                {img.status === "error" ? (
                  <span
                    title={img.reason}
                    className="bg-danger-soft text-danger absolute inset-0 grid place-items-center px-2 text-center text-xs"
                  >
                    {COPY.dashboard.form.imageFailed}
                  </span>
                ) : null}

                {i === 0 && img.status === "done" ? (
                  <span className="u-eyebrow bg-accent text-on-accent absolute top-1.5 left-1.5 rounded-xs px-1.5 py-0.5">
                    {COPY.dashboard.form.imageCover}
                  </span>
                ) : null}
              </div>

              <div className="border-line flex items-center justify-between gap-1 border-t p-1.5">
                <div className="flex gap-0.5">
                  <IconButton
                    label={COPY.dashboard.form.imageMoveUp}
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                  >
                    &larr;
                  </IconButton>
                  <IconButton
                    label={COPY.dashboard.form.imageMoveDown}
                    onClick={() => move(i, 1)}
                    disabled={i === value.length - 1}
                  >
                    &rarr;
                  </IconButton>
                  <IconButton
                    label={COPY.dashboard.form.imageSetCover}
                    onClick={() => makeCover(i)}
                    disabled={i === 0 || img.status !== "done"}
                  >
                    &#9733;
                  </IconButton>
                </div>
                <IconButton
                  label={COPY.dashboard.form.imageRemove}
                  onClick={() => remove(img.key)}
                  tone="danger"
                >
                  &times;
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-xs text-sm transition-colors disabled:opacity-30",
        tone === "danger"
          ? "text-fg-faint hover:bg-danger-soft hover:text-danger"
          : "text-fg-faint hover:bg-panel-2 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
