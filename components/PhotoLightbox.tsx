"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { publicPhotoUrl } from "@/lib/photos";

/**
 * A photo, as large as the screen allows.
 *
 * The panel is 26rem wide, so "large" inside it is not large — this is the only
 * place a photo is shown at its own scale. object-contain rather than cover:
 * the point is to see the whole picture, and a viewer that crops is just the
 * thumbnail again.
 *
 * Rendered through a portal on document.body so it escapes the panel's own
 * stacking and overflow, which would otherwise clip it to a 26rem column. No
 * "have we hydrated" guard is needed: this only ever mounts in response to a
 * click, and a click cannot happen during the build-time prerender.
 */
export function PhotoLightbox({
  paths,
  startAt = 0,
  alt,
  onClose,
}: {
  paths: string[];
  startAt?: number;
  alt: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startAt);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") setIndex((i) => Math.min(paths.length - 1, i + 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paths.length]);

  // The page behind must not scroll while this is over it — on a phone that
  // shows as the lightbox drifting off while you swipe the photo.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const many = paths.length > 1;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm">
          {many ? `${index + 1} / ${paths.length}` : ""}
        </span>
        <button
          onClick={onClose}
          aria-label="Close photo"
          className="rounded-md px-3 py-1.5 text-sm hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      {/* The backdrop closes; the image does not, so a mis-tap while looking
          does not dismiss the thing you were looking at. */}
      <button
        aria-label="Close photo"
        onClick={onClose}
        className="min-h-0 flex-1 cursor-zoom-out"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publicPhotoUrl(paths[index])}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto max-h-full max-w-full cursor-default object-contain"
        />
      </button>

      {many && (
        <div className="flex items-center justify-center gap-6 p-4 text-white">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="Previous photo"
            className="rounded-full px-4 py-2 text-xl hover:bg-white/10 disabled:opacity-30"
          >
            ‹
          </button>
          <div className="flex gap-2">
            {paths.map((path, i) => (
              <button
                key={`${path}-${i}`}
                onClick={() => setIndex(i)}
                aria-label={`Photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className="flex size-5 items-center justify-center"
              >
                <span
                  className={`size-2 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
                />
              </button>
            ))}
          </div>
          <button
            onClick={() => setIndex((i) => Math.min(paths.length - 1, i + 1))}
            disabled={index === paths.length - 1}
            aria-label="Next photo"
            className="rounded-full px-4 py-2 text-xl hover:bg-white/10 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
