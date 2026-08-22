"use client";

import { useCallback, useEffect, useState } from "react";
import { describeError, supabase } from "./supabase";
import type { Place } from "./database.types";
import { verdictOf, type VerdictState } from "./verdict";

export type PlaceWithVerdict = Place & { verdict: VerdictState };

export function usePlaces() {
  const [places, setPlaces] = useState<PlaceWithVerdict[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // The try/catch is load-bearing, not defensive habit. supabase-js returns
    // `{ error }` for anything the server answered, but *rejects* when the
    // request never got there — a paused project, a dead connection, a phone in
    // a basement. Without this the rejection escapes, neither `places` nor
    // `error` is ever set, and the page sits on "Loading…" forever with nothing
    // to tell anyone why.
    try {
      // One table, one query. The review lives on the place now, so there is
      // nothing left to join.
      const { data, error: loadError } = await supabase
        .from("places")
        .select("*")
        // Places taken off the map keep their row — and their review — but stop
        // appearing.
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

      setError(null);
      setPlaces(
        ((data ?? []) as Place[]).map((place) => ({
          ...place,
          verdict: verdictOf(place),
        })),
      );
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

/**
 * The places you have been, newest first — the front page.
 *
 * Undated visits sort to the back rather than being dropped: "I went but never
 * wrote down when" is still somewhere you went.
 */
export function toFeed(places: PlaceWithVerdict[]): PlaceWithVerdict[] {
  return places
    .filter((place) => place.been)
    .sort((a, b) => {
      if (a.visited_on && b.visited_on) {
        return b.visited_on.localeCompare(a.visited_on);
      }
      if (a.visited_on) return -1;
      if (b.visited_on) return 1;
      return a.name.localeCompare(b.name);
    });
}

/** Everywhere still on the list. */
export function wantToGo(places: PlaceWithVerdict[]): PlaceWithVerdict[] {
  return places
    .filter((place) => !place.been)
    .sort((a, b) => a.name.localeCompare(b.name));
}
