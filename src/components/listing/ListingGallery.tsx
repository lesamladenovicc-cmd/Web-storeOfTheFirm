"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { COPY } from "@/config/copy";
import { cn } from "@/lib/cn";
import { BLUR_DATA_URL, publicImageUrl } from "@/lib/images";
import type { ListingImage } from "@/types/domain";

/**
 * Image gallery with thumbnails, keyboard navigation, swipe and a
 * lightbox. The first image is `priority` — it is the LCP element on
 * this route.
 */
export function ListingGallery({
  images,
  title,
}: {
  images: ListingImage[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = images.length;

  const go = useCallback(
    (delta: number) => {
      if (count === 0) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  // Arrow keys always navigate; Escape only closes the lightbox.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Escape" && lightbox) setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lightbox]);

  if (count === 0) {
    return (
      <div className="grid aspect-4/3 place-items-center rounded-md border border-border bg-surface">
        <span className="u-eyebrow text-paper-faint">{COPY.listing.noImage}</span>
      </div>
    );
  }

  const current = images[index]!;

  return (
    <div>
      <div
        className="group relative aspect-4/3 overflow-hidden rounded-md border border-border bg-surface"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          const end = e.changedTouches[0]?.clientX;
          if (start === null || end === undefined) return;
          const dx = end - start;
          if (Math.abs(dx) > 45) go(dx > 0 ? -1 : 1);
          touchStartX.current = null;
        }}
      >
        <Image
          key={current.id}
          src={publicImageUrl(current.storagePath)}
          alt={current.alt ?? title}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          priority={index === 0}
          className="object-cover"
        />

        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label={COPY.listing.galleryOpen}
          className="absolute inset-0 cursor-zoom-in"
        />

        {count > 1 ? (
          <>
            <GalleryArrow direction="prev" onClick={() => go(-1)} />
            <GalleryArrow direction="next" onClick={() => go(1)} />
            <p className="u-numeric pointer-events-none absolute right-3 bottom-3 rounded-xs bg-bg/85 px-2 py-1 text-xs text-paper">
              {index + 1}/{count}
            </p>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${COPY.listing.galleryCounter} ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-sm border transition-colors",
                  i === index
                    ? "border-accent"
                    : "border-border hover:border-border-strong",
                )}
              >
                <Image
                  src={publicImageUrl(img.storagePath)}
                  alt=""
                  fill
                  sizes="120px"
                  className={cn("object-cover", i !== index && "opacity-65")}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-100 flex items-center justify-center bg-bg/96 p-4"
          onClick={() => setLightbox(false)}
        >
          <div
            className="relative h-full max-h-[88vh] w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={publicImageUrl(current.storagePath)}
              alt={current.alt ?? title}
              fill
              sizes="100vw"
              className="object-contain"
            />
            {count > 1 ? (
              <>
                <GalleryArrow direction="prev" onClick={() => go(-1)} />
                <GalleryArrow direction="next" onClick={() => go(1)} />
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label={COPY.common.close}
            className="absolute top-4 right-4 grid h-11 w-11 place-items-center rounded-sm border border-border-strong text-paper transition-colors hover:border-accent hover:text-accent"
          >
            <svg viewBox="0 0 14 14" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
              <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function GalleryArrow({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrev ? COPY.listing.galleryPrevious : COPY.listing.galleryNext}
      className={cn(
        "absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-sm border border-border-strong bg-bg/85 text-paper transition-colors hover:border-accent hover:text-accent",
        isPrev ? "left-3" : "right-3",
      )}
    >
      <svg viewBox="0 0 12 12" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d={isPrev ? "M8 1 3 6l5 5" : "M4 1l5 5-5 5"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
