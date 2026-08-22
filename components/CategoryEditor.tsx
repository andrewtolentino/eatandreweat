"use client";

import { useState } from "react";
import { supabase, isPermissionDenied } from "@/lib/supabase";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import type { PlaceWithDishes } from "@/lib/usePlaces";

/**
 * Author-only. Categories drive the filter on the front page, so a place with
 * none is invisible to every chip — which makes this worth having on the panel
 * rather than only on the approval form where places are created.
 *
 * Saves on each toggle rather than behind a button: there is one field here and
 * nothing to get into an inconsistent half-edited state.
 */
export function CategoryEditor({
  place,
  onChanged,
}: {
  place: PlaceWithDishes;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = place.categories ?? [];

  async function toggle(category: string) {
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];

    setBusy(true);
    setError(null);

    const { error: saveError } = await supabase
      .from("places")
      .update({ categories: next })
      .eq("id", place.id);

    setBusy(false);

    if (saveError) {
      setError(
        isPermissionDenied(saveError)
          ? "That account is not the author, so it cannot edit the map."
          : saveError.message,
      );
      return;
    }
    onChanged();
  }

  return (
    <div className="mt-4">
      <p className="eyebrow mb-2">Kind of place</p>
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((category) => {
          const on = current.includes(category);
          return (
            <button
              key={category}
              type="button"
              aria-pressed={on}
              disabled={busy}
              onClick={() => toggle(category)}
              className={`pill font-medium transition-colors disabled:opacity-50 ${
                on
                  ? "border-accent! bg-accent text-white!"
                  : "hover:border-accent! hover:text-accent!"
              }`}
            >
              {CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
