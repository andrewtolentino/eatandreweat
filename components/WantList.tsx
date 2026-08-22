"use client";

import { placeWhere } from "@/lib/database.types";
import { categoryLabel } from "@/lib/categories";
import type { PlaceWithDishes } from "@/lib/usePlaces";
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
          Either you have eaten everywhere, or the filters are too tight.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {places.map((place) => {
          const outstanding = place.dishes.filter((d) => !d.eaten);
          return (
            <li key={place.id}>
              <button
                onClick={() => onSelect(place)}
                onMouseEnter={() => onHover(place.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(place.id)}
                onBlur={() => onHover(null)}
                aria-current={place.id === selectedId ? "true" : undefined}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                  place.id === selectedId
                    ? "bg-surface-hover"
                    : "hover:bg-surface-hover"
                }`}
              >
                <PinDot state="want" className="mt-2 size-3" />

                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{place.name}</span>
                  <span className="block text-sm text-muted">
                    {placeWhere(place)}
                  </span>
                  {place.address && (
                    <span className="block text-sm text-muted">
                      {place.address}
                    </span>
                  )}
                  <span className="mt-1 block text-sm">
                    {outstanding.length > 0 ? (
                      <>
                        <span className="text-muted">Order: </span>
                        {outstanding.map((d) => d.name).join(", ")}
                      </>
                    ) : (
                      <span className="text-muted">
                        Nothing picked yet — worth a look at the menu
                      </span>
                    )}
                  </span>
                  {place.categories && place.categories.length > 0 && (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {place.categories.map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
                        >
                          {categoryLabel(c)}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

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
