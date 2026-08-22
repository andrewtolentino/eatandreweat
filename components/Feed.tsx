"use client";

import { placeWhere } from "@/lib/database.types";
import { categoryLabel } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { publicPhotoUrl } from "@/lib/photos";
import type { FeedEntry, PlaceWithDishes } from "@/lib/usePlaces";
import { VerdictChip } from "./VerdictChip";

/**
 * The front page: write-ups, newest first.
 *
 * Each card is one dish at one place, because that is where a write-up lives —
 * two dishes at the same restaurant on the same night are two entries, and the
 * KFC pot pie and the Double Down genuinely deserved separate verdicts.
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
          Everywhere on the map is still on the to-do list. Open one and write it
          up after you go.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {entries.map(({ place, dish }) => (
        <li key={dish.id}>
          <article
            onMouseEnter={() => onHover(place.id)}
            onMouseLeave={() => onHover(null)}
            className={`overflow-hidden rounded-xl border bg-surface transition-shadow ${
              place.id === selectedId
                ? "border-foreground/30 shadow-md"
                : "border-border hover:shadow-md"
            }`}
          >
            {dish.photo_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={publicPhotoUrl(dish.photo_path)}
                alt={`${dish.name} at ${place.name}`}
                loading="lazy"
                className="aspect-[3/2] w-full object-cover"
              />
            )}

            <div className="p-5">
              <div className="min-w-0">
                <div className="min-w-0">
                  <h3 className="display text-xl leading-tight">
                    {/* The whole card is hoverable for the map link, but only
                        the name is clickable — an article-wide button would
                        swallow the address text selection and the photo. */}
                    <button
                      onClick={() => onSelect(place)}
                      onFocus={() => onHover(place.id)}
                      onBlur={() => onHover(null)}
                      className="text-left hover:underline focus-visible:underline"
                    >
                      {place.name}
                    </button>
                  </h3>
                  <p className="mt-1 text-sm text-muted">{placeWhere(place)}</p>
                  {place.address && (
                    <p className="text-sm text-muted">{place.address}</p>
                  )}
                </div>
              </div>

              <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium">{dish.name}</span>
                {dish.eaten_on && (
                  <span className="text-muted">{formatDate(dish.eaten_on)}</span>
                )}
              </p>

              {dish.note && (
                <p className="mt-2 leading-relaxed whitespace-pre-line">
                  {dish.note}
                </p>
              )}

              <ul className="mt-4 flex flex-wrap gap-1">
                <li>
                  <VerdictChip state={dish.state} />
                </li>
                {(place.categories ?? []).map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
                  >
                    {categoryLabel(c)}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
