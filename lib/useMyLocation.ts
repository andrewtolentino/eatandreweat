"use client";

import { useCallback, useState } from "react";

export type Coords = { lat: number; lng: number };

/**
 * Where you are, on request.
 *
 * Deliberately not asked for on page load. The permission prompt is
 * interruptive and most visitors are reading rather than adding somewhere, so
 * it fires only when you press the button that needs it.
 */
export function useMyLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async (): Promise<Coords | null> => {
    if (!("geolocation" in navigator)) {
      setError("This browser can't share a location.");
      return null;
    }

    setBusy(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(next);
          setBusy(false);
          resolve(next);
        },
        (err) => {
          setBusy(false);
          // Denial is a choice, not a fault — say so plainly and let the search
          // fall back to an unbounded one rather than dead-ending.
          setError(
            err.code === err.PERMISSION_DENIED
              ? "Location off — searching everywhere instead."
              : "Couldn't get a location — searching everywhere instead.",
          );
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
  }, []);

  return { coords, locate, busy, error };
}
