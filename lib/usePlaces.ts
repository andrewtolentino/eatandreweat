"use client";

import { useCallback, useEffect, useState } from "react";
import { describeError, supabase } from "./supabase";
import type { Dish, Place } from "./database.types";
import { dishState, eatenVerdict, type VerdictState } from "./verdict";

export type DishWithState = Dish & { state: VerdictState };

export type PlaceWithDishes = Place & {
  dishes: DishWithState[];
  /** Whether anything here has been eaten. This is what the pin reflects. */
  been: boolean;
  /**
   * The most recent `eaten_on` across this place's dishes, or null if you have
   * not been. What the feed sorts on.
   */
  lastVisit: string | null;
};

/** One place you have been, as the feed shows it. */
export type FeedEntry = {
  place: PlaceWithDishes;
  /** Rolled up from the dishes eaten here. */
  verdict: VerdictState;
  /**
   * The write-ups. Usually one, and then the card is just prose — which is the
   * point of a place-level card. But a restaurant with two dishes written up
   * has two opinions, and running them together unlabelled produces a
   * paragraph that contradicts itself, so the dish name comes back as a
   * lead-in *only* when there is more than one.
   */
  reviews: { dish: string; note: string }[];
  lastVisit: string | null;
};

/**
 * The places you have been, newest first — the front page.
 *
 * A card per *place*, not per dish. Two dishes at one restaurant were two
 * entries with identical headings, which read as a bug rather than as detail,
 * and it made the front page a catalogue of orders instead of a log of places.
 * What you ordered lives in the write-up, where it reads as a recommendation,
 * and in the panel, where it is structured.
 *
 * Undated visits sort to the back rather than being dropped: "I went but never
 * wrote down when" is still somewhere you went.
 */
export function toFeed(places: PlaceWithDishes[]): FeedEntry[] {
  return places
    .filter((place) => place.been)
    .map((place) => ({
      place,
      verdict: eatenVerdict(place.dishes),
      reviews: place.dishes
        .filter((d) => d.eaten && d.note)
        .map((d) => ({ dish: d.name, note: d.note!.trim() })),
      lastVisit: place.lastVisit,
    }))
    .sort((a, b) => {
      if (a.lastVisit && b.lastVisit) return b.lastVisit.localeCompare(a.lastVisit);
      if (a.lastVisit) return -1;
      if (b.lastVisit) return 1;
      return a.place.name.localeCompare(b.place.name);
    });
}

export function usePlaces() {
  const [places, setPlaces] = useState<PlaceWithDishes[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // The try/catch is load-bearing, not defensive habit. supabase-js returns
    // `{ error }` for anything the server answered, but *rejects* when the
    // request never got there — a paused project, a dead connection, a phone in
    // a basement. Without this the rejection escapes, neither `places` nor
    // `error` is ever set, and the page sits on "Loading…" forever with nothing
    // to tell anyone why.
    try {
      // One query. With the verdict living on the dish row there is no rollup
      // view to join against, which is most of what going single-author bought.
      const { data, error: loadError } = await supabase
        .from("places")
        .select("*, dishes(*)")
        // Places taken off the map keep their row — and their write-ups — but
        // stop appearing.
        .eq("status", "open")
        .order("name");

      if (loadError) {
        // Through describeError as well: supabase-js catches a failed fetch
        // itself and hands it back here as an ordinary error whose message is
        // the raw "TypeError: Failed to fetch". Same failure, same sentence,
        // whichever path it arrives by.
        setError(describeError(loadError.message));
        return;
      }

      const merged = ((data ?? []) as (Place & { dishes: Dish[] })[]).map(
        (place) => {
          const dishes: DishWithState[] = (place.dishes ?? [])
            .map((dish) => ({ ...dish, state: dishState(dish) }))
            // PostgREST returns embedded rows in no guaranteed order, and a
            // panel whose dishes reshuffle between loads is disorienting.
            .sort((a, b) => a.name.localeCompare(b.name));

          const visits = dishes
            .map((d) => d.eaten_on)
            .filter((d): d is string => Boolean(d));

          return {
            ...place,
            dishes,
            been: dishes.some((d) => d.eaten),
            // ISO dates sort correctly as strings, so no Date objects needed.
            lastVisit: visits.length ? visits.sort().at(-1)! : null,
          };
        },
      );

      setError(null);
      setPlaces(merged);
    } catch (thrown) {
      setError(describeError(thrown));
    }
  }, []);

  useEffect(() => {
    // Wrapped rather than called bare: `load` only writes state after its first
    // await, but from the effect body that is invisible — to a reader and to
    // react-hooks/set-state-in-effect, which flags the bare call as a
    // synchronous cascading render. The await says out loud what is true.
    void (async () => {
      await load();
    })();
  }, [load]);

  return { places, error, loading: places === null && error === null, reload: load };
}
