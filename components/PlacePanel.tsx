"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PlaceWithDishes } from "@/lib/usePlaces";
import { useAuth } from "@/lib/useAuth";
import { placeWhere } from "@/lib/database.types";
import { PIN_LABELS } from "@/lib/verdict";
import { categoryLabel } from "@/lib/categories";
import { PinDot } from "./PinDot";
import { CategoryEditor } from "./CategoryEditor";
import { DishCard } from "./DishCard";
import { ReportGone } from "./ReportGone";

/**
 * Author-only. Places arrive on the map before you have decided what to order
 * there — half the original sheet was exactly that — so adding the dish later
 * has to be possible from the place itself.
 */
function AddDish({
  place,
  onAdded,
}: {
  place: PlaceWithDishes;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("dishes")
      .insert({ place_id: place.id, name: name.trim() });

    setBusy(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "That dish is already on the list here."
          : insertError.message,
      );
      return;
    }
    setName("");
    setOpen(false);
    onAdded();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-hover"
      >
        Add a dish
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
      <input
        autoFocus
        required
        maxLength={120}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Double Down"
        aria-label="Dish name"
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-8 flex-1 rounded-md bg-accent-strong px-3 text-xs font-semibold text-white hover:bg-accent disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add dish"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-8 rounded-md px-3 text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PlacePanel({
  place,
  onClose,
  onChanged,
}: {
  place: PlaceWithDishes;
  onClose: () => void;
  /** Refetches the map, so a pin recolours the moment its dish is answered. */
  onChanged: () => void;
}) {
  const { isAuthor } = useAuth();

  const mapsQuery = encodeURIComponent(
    [place.name, place.address, place.city].filter(Boolean).join(", "),
  );

  return (
    // A drawer over the whole page rather than a panel inside the map, because
    // it is now opened from the feed as often as from a pin.
    <aside
      className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[26rem] sm:rounded-none sm:rounded-l-2xl"
      aria-label={`Details for ${place.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="display text-2xl leading-tight">{place.name}</h2>
          <p className="mt-1 text-sm text-muted">{placeWhere(place)}</p>
          {place.address && (
            <p className="text-sm text-muted">{place.address}</p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-1 shrink-0 rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <PinDot state={place.been ? "been" : "want"} className="size-3" />
        <span className="text-sm text-muted">
          {PIN_LABELS[place.been ? "been" : "want"]}
        </span>
      </div>

      {isAuthor ? (
        <CategoryEditor place={place} onChanged={onChanged} />
      ) : (
        place.categories &&
        place.categories.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1">
            {place.categories.map((c) => (
              <li
                key={c}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
              >
                {categoryLabel(c)}
              </li>
            ))}
          </ul>
        )
      )}

      <section className="mt-5">
        <h3 className="eyebrow">What to order</h3>

        {place.dishes.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
Nothing picked yet — this one made the map on reputation alone.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {place.dishes.map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                placeName={place.name}
                isAuthor={isAuthor}
                onChanged={onChanged}
              />
            ))}
          </ul>
        )}

        {isAuthor && <AddDish place={place} onAdded={onChanged} />}
      </section>

      {/* Separates the verdict from the practical details — where it is,
          how to get there — which are a different kind of information. */}
      <div className="mt-5 flex flex-col gap-2 border-t border-border pt-5 text-sm">
        <a
          className="underline decoration-border underline-offset-2 hover:decoration-foreground"
          href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open in Google Maps →
        </a>
        {place.website && (
          <a
            className="underline decoration-border underline-offset-2 hover:decoration-foreground"
            href={place.website}
            target="_blank"
            rel="noreferrer noopener"
          >
            Website →
          </a>
        )}
      </div>

      <ReportGone place={place} />
    </aside>
  );
}
