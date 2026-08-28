"use client";

import { useRef, useState } from "react";
import { publicPhotoUrl } from "@/lib/photos";

/**
 * The photos on a card.
 *
 * A scroll-snap strip does the swiping — that is what a phone already does, it
 * needs no state to be correct, and it keeps working if the script never loads.
 * On top of it sit real controls, because a swipe is not available to a mouse
 * and the dots were previously decoration: they were pointer-events-none, so
 * tapping one fell through to the card and opened the place instead of moving
 * to that photo.
 *
 * The strip forwards a plain click to onOpen so tapping a photo still opens the
 * place; the arrows and dots are siblings of the scroller rather than children,
 * so their clicks never reach that handler.
 */
export function PhotoStrip({
  paths,
  alt,
  onOpen,
  className = "",
}: {
  paths: string[];
  alt: string;
  onOpen: () => void;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const many = paths.length > 1;

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    // Which panel is nearest the middle. Rounding on width handles the
    // half-scrolled state without an observer per image.
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(next);
  }

  function goTo(next: number, event: React.MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(paths.length - 1, next));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    // Set it now rather than waiting for the scroll handler, so the dots
    // respond on press instead of a beat later.
    setIndex(clamped);
  }

  return (
    <div className={`group relative z-10 ${className}`}>
      <div
        ref={scroller}
        onScroll={onScroll}
        onClick={onOpen}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
      >
        {paths.map((path, i) => (
          // Index in the key, not the path alone: this is a fixed-order list
          // that only ever appends, and a repeated path — the same photo added
          // twice — would otherwise collide and drop a panel.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${path}-${i}`}
            src={publicPhotoUrl(path)}
            alt={alt}
            loading="lazy"
            className="h-56 w-full shrink-0 snap-center object-cover sm:h-full"
          />
        ))}
      </div>

      {many && (
        <>
          {/* Always present rather than hover-only: on a touch screen there is
              no hover, and a control that only exists for mice is not a
              control. Dimmed until hover on pointer devices so they stay out
              of the photo's way. */}
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => goTo(index - 1, e)}
            disabled={index === 0}
            className="absolute top-1/2 left-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-sm shadow-sm transition-opacity hover:bg-surface disabled:opacity-0 md:opacity-0 md:group-hover:opacity-100"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => goTo(index + 1, e)}
            disabled={index === paths.length - 1}
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-sm shadow-sm transition-opacity hover:bg-surface disabled:opacity-0 md:opacity-0 md:group-hover:opacity-100"
          >
            ›
          </button>

          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {paths.map((path, i) => (
              <button
                key={`${path}-${i}`}
                type="button"
                aria-label={`Photo ${i + 1} of ${paths.length}`}
                aria-current={i === index ? "true" : undefined}
                onClick={(e) => goTo(i, e)}
                /* A 16px hit area around a 6px dot: the dot is the smallest
                   thing on the card and fingers are not. */
                className="flex size-4 items-center justify-center"
              >
                <span
                  className={`size-1.5 rounded-full transition-colors ${
                    i === index ? "bg-white" : "bg-white/50"
                  }`}
                  style={{ boxShadow: "0 0 2px rgb(0 0 0 / 0.5)" }}
                />
              </button>
            ))}
          </div>

          <span className="pointer-events-none absolute top-2 right-2 rounded-full bg-foreground/75 px-2 py-0.5 text-[11px] font-medium text-background">
            {index + 1} / {paths.length}
          </span>
        </>
      )}
    </div>
  );
}
