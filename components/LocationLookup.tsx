"use client";

import { useState } from "react";
import { geocode, type GeocodeHit } from "@/lib/geocode";

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
}: {
  /** What to search for. Empty disables the button. */
  query: string;
  onPick: (hit: GeocodeHit) => void;
  hint?: string;
}) {
  const [hits, setHits] = useState<GeocodeHit[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function look() {
    setBusy(true);
    setHits(null);
    const found = await geocode(query.trim());
    setBusy(false);
    setHits(found);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={look}
          disabled={busy || !query.trim()}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover disabled:opacity-50"
        >
          {busy ? "Looking…" : "Find the address"}
        </button>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>

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
