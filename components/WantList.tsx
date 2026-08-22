"use client";

import { placeWhere } from "@/lib/database.types";
import { categoryLabel } from "@/lib/categories";
import type { PlaceWithDishes } from "@/lib/usePlaces";
import { PIN_LABELS } from "@/lib/verdict";
import { PinDot } from "./PinDot";

/**
 * Everywhere with something left to try.
 *
 * Not simply "places I haven't been": a restaurant where one dish is written up
 * and another is still on the list belongs here too, because there is still a
 * reason to go. That is why this looks at the dishes rather than at the place's
 * rolled-up state, which reports its *best* dish and would hide those.
 */
export function wantToGo(places: PlaceWithDishes[]): PlaceWithDishes[] {
  return places
    .filter(
      (place) =>
        place.dishes.length === 0 || place.dishes.some((dish) => !dish.eaten),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function WantList({
  places,
  selectedId,
  onSelect,
  onHover,
  onSuggest,
}: {
  places: PlaceWithDishes[];
  selectedId: string | null;
  onSelect: (place: PlaceWithDishes) => void;
  onHover: (placeId: string | null) => void;
  onSuggest: () => void;
}) {
  if (places.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="display text-lg">Nothing left on the list</p>
        <p className="mt-1 text-sm text-muted">
          Either I&rsquo;ve eaten everywhere, or the filters are too tight.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card per place, matching the feed exactly. The two tabs are the same
          kind of thing seen at two stages — somewhere you mean to go and
          somewhere you went — so switching between them should not feel like
          switching between two different interfaces. */}
      <ol className="flex flex-col gap-4">
        {places.map((place) => {
          const outstanding = place.dishes.filter((d) => !d.eaten);
          return (
            <li key={place.id}>
              <article
                onMouseEnter={() => onHover(place.id)}
                onMouseLeave={() => onHover(null)}
                className={`relative cursor-pointer overflow-hidden rounded-xl border bg-surface transition-shadow ${
                  place.id === selectedId
                    ? "border-foreground/30 shadow-md"
                    : "border-border hover:shadow-md"
                }`}
              >
                <div className="p-5">
                  <h3 className="display text-xl leading-tight">
                    {/* Stretched via ::after so the whole card is the hit
                        area — see the note in Feed. */}
                    <button
                      onClick={() => onSelect(place)}
                      onFocus={() => onHover(place.id)}
                      onBlur={() => onHover(null)}
                      className="text-left after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:underline"
                    >
                      {place.name}
                    </button>
                  </h3>
                  <p className="mt-1 text-sm text-muted">{placeWhere(place)}</p>
                  {place.address && (
                    <p className="text-sm text-muted">{place.address}</p>
                  )}

                  <p className="mt-4 text-sm">
                    {outstanding.length > 0 ? (
                      <>
                        <span className="text-muted">Order: </span>
                        <span className="font-medium">
                          {outstanding.map((d) => d.name).join(", ")}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">
                        Nothing picked yet — worth a look at the menu
                      </span>
                    )}
                  </p>

                  <ul className="mt-4 flex flex-wrap gap-1">
                    <li className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                      <PinDot state="want" className="size-1.5" />
                      {PIN_LABELS.want}
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
          );
        })}
      </ol>

      <p className="px-1 text-sm text-muted">
        Somewhere missing?{" "}
        <button
          onClick={onSuggest}
          className="underline decoration-border underline-offset-2 hover:decoration-foreground"
        >
          Send me a suggestion
        </button>
        .
      </p>
    </div>
  );
}
