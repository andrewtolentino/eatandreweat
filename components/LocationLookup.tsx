"use client";

import { useState } from "react";
import { geocode, type GeocodeHit } from "@/lib/geocode";
import { useMyLocation } from "@/lib/useMyLocation";

/**
 * "I know the name, find me the rest."
 *
 * Shows every candidate rather than taking the first: "Tartine" is a bakery in
 * San Francisco and a café in Paris, and quietly picking one would put the pin
 * on the wrong continent. Nothing is written until a candidate is chosen.
 */
export function LocationLookup({
  query,
  onPick,
  hint,
  /** Offer a "near me" search. On for adding somewhere you are standing in. */
  offerNearby = false,
  /** What the search button says. Two lookups on one form need to differ. */
  label = "Search everywhere",
}: {
  /** What to search for. Empty disables the button. */
  query: string;
  onPick: (hit: GeocodeHit) => void;
  hint?: string;
  offerNearby?: boolean;
  label?: string;
}) {
  const [hits, setHits] = useState<GeocodeHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const { locate, busy: locating, error: locationError } = useMyLocation();

  async function look(useLocation: boolean) {
    setBusy(true);
    setHits(null);
    // A denied or failed lookup returns null and the search simply runs
    // unbounded, which is the old behaviour rather than a dead end.
    const near = useLocation ? ((await locate()) ?? undefined) : undefined;
    const found = await geocode(query.trim(), { near });
    setBusy(false);
    setHits(found);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {offerNearby && (
          <button
            type="button"
            onClick={() => look(true)}
            disabled={busy || locating || !query.trim()}
            className="rounded-lg border border-accent px-3 py-1.5 text-xs font-medium text-accent hover:bg-surface-hover disabled:opacity-50"
          >
            {locating ? "Locating…" : busy ? "Looking…" : "Find near me"}
          </button>
        )}
        <button
          type="button"
          onClick={() => look(false)}
          disabled={busy || locating || !query.trim()}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover disabled:opacity-50"
        >
          {busy && !locating ? "Looking…" : label}
        </button>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>

      {locationError && <p className="text-xs text-muted">{locationError}</p>}

      {hits?.length === 0 && (
        <p className="text-xs text-muted">
          No match. Type the address in, or search the name with its city.
        </p>
      )}

      {hits && hits.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg border border-border p-1">
          {hits.map((hit) => (
            <li key={`${hit.lat},${hit.lng}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(hit);
                  setHits(null);
                }}
                className="w-full rounded-md px-2 py-1.5 text-left text-xs leading-snug hover:bg-surface-hover"
              >
                {hit.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
