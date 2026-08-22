"use client";

import { placeWhere } from "@/lib/database.types";
import { categoryLabel } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { publicPhotoUrl } from "@/lib/photos";
import type { FeedEntry, PlaceWithDishes } from "@/lib/usePlaces";
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
  entries: FeedEntry[];
  selectedId: string | null;
  onSelect: (place: PlaceWithDishes) => void;
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
      {entries.map(({ place, verdict, reviews, lastVisit }) => {
        // The first photo anyone attached here. One image per card: this is a
        // log, not a gallery, and the rest are in the panel.
        const photo = place.dishes.find((d) => d.photo_path)?.photo_path ?? null;

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
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={publicPhotoUrl(photo)}
                  alt={place.name}
                  loading="lazy"
                  className="aspect-[3/2] w-full object-cover"
                />
              )}

              <div className="p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="display min-w-0 text-xl leading-tight">
                    {/* One button, stretched. The ::after covers the whole
                        card, so tapping anywhere opens the place — but the
                        button itself is still just the name, which keeps the
                        accessible name short and avoids nesting controls
                        inside a giant clickable region. */}
                    <button
                      onClick={() => onSelect(place)}
                      onFocus={() => onHover(place.id)}
                      onBlur={() => onHover(null)}
                      className="text-left after:absolute after:inset-0 after:content-[''] hover:text-accent hover:underline focus-visible:underline"
                    >
                      {place.name}
                    </button>
                  </h3>
                  {lastVisit && (
                    <span className="shrink-0 text-xs text-muted">
                      {formatDate(lastVisit)}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-muted">{placeWhere(place)}</p>
                {place.address && (
                  <p className="text-sm text-muted">{place.address}</p>
                )}

                {reviews.length === 0 ? (
                  <p className="mt-3 text-sm text-muted italic">
                    Been, not written up yet.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2">
                    {reviews.map(({ dish, note }) => (
                      <p key={dish} className="leading-relaxed whitespace-pre-line">
                        {/* Named only when there is something to tell apart. */}
                        {reviews.length > 1 && (
                          <span className="font-medium">{dish}. </span>
                        )}
                        {note}
                      </p>
                    ))}
                  </div>
                )}

                <ul className="mt-4 flex flex-wrap gap-1.5">
                  <li>
                    <VerdictChip state={verdict} />
                  </li>
                  {(place.categories ?? []).map((c) => (
                    <li key={c} className="pill">
                      {categoryLabel(c)}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
