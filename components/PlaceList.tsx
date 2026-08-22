"use client";

import { useMemo, useState } from "react";
import type { PlaceWithDishes } from "@/lib/usePlaces";
import { placeWhere } from "@/lib/database.types";
import { PIN_LABELS } from "@/lib/verdict";
import { PinDot } from "./PinDot";

type SortMode = "place" | "want" | "been";

// The same two states the map uses, so switching between the list and the pins
// never means re-learning what the categories are.
const SORT_LABELS: Record<SortMode, string> = {
  place: "Everywhere",
  want: "Want to go",
  been: "Been",
};

/** Been first, then A–Z so the order is stable between renders. */
function byStateThenName(a: PlaceWithDishes, b: PlaceWithDishes) {
  return Number(b.been) - Number(a.been) || a.name.localeCompare(b.name);
}

function matches(place: PlaceWithDishes, query: string): boolean {
  if (!query) return true;
  const haystack = [
    place.name,
    place.neighborhood,
    place.city,
    place.country,
    place.address,
    // Searching the dish is the whole point of a list like this — "ramen"
    // should find Yamadaya even though the word is nowhere in its name.
    ...place.dishes.map((d) => d.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

/**
 * Group by city, then order the groups by size.
 *
 * The old version grouped by a five-value Bay Area enum in a hand-written
 * order, which stopped working the moment the list left California. City is
 * free text now, so the order has to come from the data: wherever you have
 * eaten most is the most useful group to put first, and one-off cities fall to
 * the bottom instead of needing a place in a hardcoded list.
 */
function groupByCity(places: PlaceWithDishes[]) {
  const groups = new Map<string, PlaceWithDishes[]>();

  for (const place of places) {
    const key = [place.city, place.country].filter(Boolean).join(", ") ||
      "Somewhere else";
    const bucket = groups.get(key);
    if (bucket) bucket.push(place);
    else groups.set(key, [place]);
  }

  return [...groups.entries()]
    .map(([city, inCity]) => ({ city, places: inCity.sort(byStateThenName) }))
    .sort(
      (a, b) => b.places.length - a.places.length || a.city.localeCompare(b.city),
    );
}

function PlaceRow({
  place,
  selected,
  onSelect,
  onHover,
}: {
  place: PlaceWithDishes;
  selected: boolean;
  onSelect: (place: PlaceWithDishes) => void;
  onHover?: (placeId: string | null) => void;
}) {
  const dishes = place.dishes.map((d) => d.name).join(", ");

  return (
    <li>
      <button
        onClick={() => onSelect(place)}
        onMouseEnter={() => onHover?.(place.id)}
        onMouseLeave={() => onHover?.(null)}
        onFocus={() => onHover?.(place.id)}
        onBlur={() => onHover?.(null)}
        aria-current={selected ? "true" : undefined}
        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
          selected
            ? "bg-surface-hover ring-1 ring-foreground/20"
            : "hover:bg-surface-hover"
        }`}
      >
        <PinDot state={place.been ? "been" : "want"} className="mt-1.5 size-3" />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{place.name}</span>
          <span className="block truncate text-xs text-muted">
            {dishes || "Nothing picked yet"}
          </span>
          <span className="block truncate text-xs text-muted">
            {placeWhere(place)}
          </span>
        </span>
      </button>
    </li>
  );
}

export function PlaceList({
  places,
  selectedId,
  onSelect,
  onHover,
}: {
  places: PlaceWithDishes[];
  selectedId: string | null;
  onSelect: (place: PlaceWithDishes) => void;
  onHover?: (placeId: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("place");

  const found = useMemo(
    () => places.filter((place) => matches(place, query)),
    [places, query],
  );

  // The two non-default sorts are really filters with an order attached: "still
  // to eat" is the to-do list and "worth going back" is the shortlist, and
  // padding either one out with the places that don't qualify would defeat it.
  const filtered = useMemo(() => {
    if (sort === "place") return [];
    return found
      .filter((p) => (sort === "been" ? p.been : !p.been))
      .sort(byStateThenName);
  }, [found, sort]);

  const groups = useMemo(() => groupByCity(found), [found]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 px-3 pt-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search places, dishes, cities…"
          aria-label="Search by place, dish or city"
          className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Filter places"
          className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-xs outline-none focus:border-accent"
        >
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
            <option key={mode} value={mode}>
              {SORT_LABELS[mode]}
            </option>
          ))}
        </select>
        {query && (
          <p className="text-xs text-muted">
            {found.length} of {places.length}
          </p>
        )}
      </div>

      {found.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">
          Nothing matches “{query}”.
        </p>
      ) : sort === "place" ? (
        <div className="flex flex-col gap-5 p-3">
          {groups.map(({ city, places: inCity }) => (
            <section key={city}>
              <h2 className="eyebrow flex items-baseline gap-1.5 px-2 pb-2">
                {city}
                <span className="text-[11px] font-normal normal-case tracking-normal">
                  ({inCity.length})
                </span>
              </h2>
              <ul className="flex flex-col gap-1">
                {inCity.map((place) => (
                  <PlaceRow
                    key={place.id}
                    place={place}
                    selected={place.id === selectedId}
                    onSelect={onSelect}
                    onHover={onHover}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">
          {sort === "want"
            ? "Nothing left on the to-do list."
            : `Nowhere ${PIN_LABELS.been.toLowerCase()} yet.`}
        </p>
      ) : (
        <ul className="flex flex-col gap-1 p-3">
          {filtered.map((place) => (
            <PlaceRow
              key={place.id}
              place={place}
              selected={place.id === selectedId}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
