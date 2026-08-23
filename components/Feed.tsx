"use client";

import { placeWhere } from "@/lib/database.types";
import { categoryLabel } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { publicPhotoUrl } from "@/lib/photos";
import type { PlaceWithVerdict } from "@/lib/usePlaces";
import { VerdictChip } from "./VerdictChip";

/**
 * The front page: places you have been, newest first.
 *
 * A card is a place and a short review, not a dish. What to order is in the
 * write-up, where it reads as a recommendation rather than as a database field
 * — and in the panel, where it is structured and editable.
 */
export function Feed({
  entries,
  selectedId,
  onSelect,
  onHover,
}: {
  entries: PlaceWithVerdict[];
  selectedId: string | null;
  onSelect: (place: PlaceWithVerdict) => void;
  /** Hovering a card flies the map to it. Null on leave. */
  onHover: (placeId: string | null) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="display text-lg">Nothing written up yet</p>
        <p className="mt-1 text-sm text-muted">
          Everywhere on the map is still on the to-do list. I&rsquo;ll write them
          up as I go.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {entries.map((place) => {
        return (
          <li key={place.id}>
            <article
              onMouseEnter={() => onHover(place.id)}
              onMouseLeave={() => onHover(null)}
              /* `relative` anchors the heading button's ::after overlay below,
                 which is what makes the whole card tappable. */
              className={`relative cursor-pointer overflow-hidden rounded-xl border bg-surface transition-shadow ${
                place.id === selectedId
                  ? "border-accent/40 shadow-md"
                  : "border-border hover:shadow-md"
              }`}
            >
              {place.photo_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={publicPhotoUrl(place.photo_path)}
                  alt={place.name}
                  loading="lazy"
                  /* Height, not aspect ratio. At 3:2 the photo scaled with the
                     column: right on a phone, and about 460px tall in the
                     desktop feed, which pushed the review off the screen. A
                     fixed height keeps the picture generous on a narrow screen
                     and turns it into a banner on a wide one. */
                  className="h-56 w-full object-cover sm:h-64 lg:h-72"
                />
              )}

              <div className="p-5">
                <h3 className="display text-xl leading-tight">
                  {/* One button, stretched. The ::after covers the whole card,
                      so tapping anywhere opens the place — but the button
                      itself is still just the name, which keeps the accessible
                      name short and avoids nesting controls inside a giant
                      clickable region. */}
                  <button
                    onClick={() => onSelect(place)}
                    onFocus={() => onHover(place.id)}
                    onBlur={() => onHover(null)}
                    className="text-left after:absolute after:inset-0 after:content-[''] hover:text-accent hover:underline focus-visible:underline"
                  >
                    {place.name}
                  </button>
                </h3>
                <p className="mt-1 text-sm text-muted">{placeWhere(place)}</p>
                {place.address && (
                  <p className="text-sm text-muted">{place.address}</p>
                )}

                {place.review ? (
                  <p className="mt-3 leading-relaxed whitespace-pre-line">
                    {place.review}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted italic">
                    Been, not written up yet.
                  </p>
                )}

                {place.to_order && (
                  <p className="mt-3 text-sm">
                    <span className="text-muted">Get: </span>
                    <span className="font-medium">{place.to_order}</span>
                  </p>
                )}

                <ul className="mt-4 flex flex-wrap items-center gap-1.5">
                  <li>
                    <VerdictChip state={place.verdict} />
                  </li>
                  {(place.categories ?? []).map((c) => (
                    <li key={c} className="pill">
                      {categoryLabel(c)}
                    </li>
                  ))}
                  {/* Down here now that the thumbnail owns the top-right. */}
                  {place.visited_on && (
                    <li className="ml-auto text-xs text-muted">
                      {formatDate(place.visited_on)}
                    </li>
                  )}
                </ul>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
