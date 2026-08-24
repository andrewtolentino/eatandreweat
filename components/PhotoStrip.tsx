"use client";

import { useRef, useState } from "react";
import { publicPhotoUrl } from "@/lib/photos";

/**
 * The photos on a card, swipeable.
 *
 * A scroll-snap strip rather than JavaScript arrows: swiping is what a phone
 * already does, it needs no state to be correct, and it keeps working if the
 * script never loads. Dots show how many there are and where you are.
 *
 * The strip sits above the card's tap overlay so the browser gives it the
 * gesture — but it forwards a plain click on to the same handler, so tapping a
 * photo still opens the place and only a drag scrolls. Browsers already tell
 * those two apart: a click does not fire after a scroll-drag.
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

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    // Which panel is nearest the middle. Rounding on width handles the
    // half-scrolled state without needing an observer per image.
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(next);
  }

  return (
    <div className={`relative z-10 ${className}`}>
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

      {paths.length > 1 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5"
        >
          {paths.map((path, i) => (
            <span
              key={`${path}-${i}`}
              className={`size-1.5 rounded-full transition-colors ${
                i === index ? "bg-white" : "bg-white/50"
              }`}
              style={{ boxShadow: "0 0 2px rgb(0 0 0 / 0.5)" }}
            />
          ))}
        </div>
      )}

      {/* Count as well as dots: at six photos the dots stop being countable,
          and "1 / 6" is the thing you actually want to know. */}
      {paths.length > 1 && (
        <span className="pointer-events-none absolute top-2 right-2 rounded-full bg-foreground/75 px-2 py-0.5 text-[11px] font-medium text-background">
          {index + 1} / {paths.length}
        </span>
      )}
    </div>
  );
}
