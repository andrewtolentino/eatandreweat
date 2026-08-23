"use client";

import { placeWhere } from "@/lib/database.types";
import { categoryLabel } from "@/lib/categories";
import type { PlaceWithVerdict } from "@/lib/usePlaces";
import { PIN_LABELS } from "@/lib/verdict";
import { PinDot } from "./PinDot";

export function WantList({
  places,
  selectedId,
  onSelect,
  onHover,
  onSuggest,
}: {
  places: PlaceWithVerdict[];
  selectedId: string | null;
  onSelect: (place: PlaceWithVerdict) => void;
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
                    {place.to_order ? (
                      <>
                        <span className="text-muted">Get: </span>
                        <span className="font-medium">{place.to_order}</span>
                      </>
                    ) : (
                      <span className="text-muted">
                        Nothing picked yet — worth a look at the menu
                      </span>
                    )}
                  </p>

                  <ul className="mt-4 flex flex-wrap gap-1">
                    <li className="pill">
                      <PinDot state="want" className="size-1.5 shrink-0" />
                      {PIN_LABELS.want}
                    </li>
                    {(place.categories ?? []).map((c) => (
                      <li
                        key={c}
                        className="pill"
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
