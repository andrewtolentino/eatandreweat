"use client";

import { useState } from "react";
import { supabase, isPermissionDenied } from "@/lib/supabase";
import { slugify } from "@/lib/slug";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { LocationLookup } from "./LocationLookup";

const FIELD =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Author-only. Somewhere you are standing in, straight onto the map.
 *
 * The suggestion box exists for other people and routes through a review queue,
 * which is right for a tip and absurd for your own find — you would be
 * suggesting a place to yourself and then approving it. This writes directly.
 *
 * The review half is optional and collapsed by default, because the two real
 * situations are "note this before I forget" and "I just ate here", and only
 * the second needs it. Either way it is one screen and one save.
 */
export function QuickAdd({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  /** Hands back the new id so the caller can open it. */
  onAdded: (placeId: string) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  // Strings, not numbers: these are typed into as often as they are looked up,
  // and a half-typed "-122." is not a number yet.
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [found, setFound] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [toOrder, setToOrder] = useState("");

  const [been, setBeen] = useState(false);
  const [again, setAgain] = useState<boolean | null>(null);
  const [review, setReview] = useState("");
  const [visitedOn, setVisitedOn] = useState(today());

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const latNum = Number(lat.trim());
    const lngNum = Number(lng.trim());

    if (!lat.trim() || !lng.trim() || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setError("Coordinates are required — look it up, or paste them in below.");
      return;
    }
    if (Math.abs(latNum) > 90 || Math.abs(lngNum) > 180) {
      setError("Those coordinates are out of range — latitude first, then longitude.");
      return;
    }

    setBusy(true);
    setError(null);

    const { data, error: saveError } = await supabase
      .from("places")
      .insert({
        slug: `${slugify(name)}-${Date.now().toString(36).slice(-4)}`,
        name: name.trim(),
        address: address.trim() || null,
        neighborhood: neighborhood.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        categories,
        lat: latNum,
        lng: lngNum,
        to_order: toOrder.trim() || null,
        // The constraint rejects a verdict without a visit, so everything on
        // the review half is conditional on the tick.
        been,
        again: been ? again : null,
        review: been ? review.trim() || null : null,
        visited_on: been ? visitedOn || null : null,
      })
      .select("id")
      .single();

    setBusy(false);

    if (saveError || !data) {
      setError(
        isPermissionDenied(saveError)
          ? "That account is not the author, so it cannot add places."
          : (saveError?.message ?? "Could not add the place."),
      );
      return;
    }

    onAdded(data.id);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="display text-lg">Add a place</h2>
        <p className="mt-1 text-sm text-muted">
          Straight onto the map — no suggestion queue. Review it now or leave it
          on the list.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="qa-name" className="text-xs font-medium">
          Name <span className="text-muted">(required)</span>
        </label>
        <input
          id="qa-name"
          required
          autoFocus
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Toyose"
          className={FIELD}
        />
        <LocationLookup
          offerNearby
          query={[name, city].filter(Boolean).join(", ")}
          hint={name.trim() ? undefined : "Add the name first"}
          onPick={(hit) => {
            setAddress(hit.address ?? "");
            setNeighborhood(hit.neighborhood ?? "");
            setCity(hit.city ?? "");
            setCountry(hit.country ?? "");
            setLat(String(hit.lat));
            setLng(String(hit.lng));
            setFound(hit.label);
          }}
        />
        {found && (
          <p className="text-xs text-muted">
            📍 {found}{" "}
            <button
              type="button"
              onClick={() => setFound(null)}
              className="underline decoration-border underline-offset-2 hover:decoration-foreground"
            >
              Not this one
            </button>
          </p>
        )}
      </div>

      {/* Always visible, never gated on a match. Searching by business name
          misses more often than it hits — most newer restaurants simply are not
          in OpenStreetMap — so the manual path has to be a peer of the lookup,
          not a consolation prize hidden behind a failure. */}
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="eyebrow">Where</p>

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street address"
          aria-label="Address"
          className={FIELD}
        />
        <div className="flex gap-2">
          <input
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Neighborhood"
            aria-label="Neighborhood"
            className={FIELD}
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            aria-label="City"
            className={FIELD}
          />
        </div>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country"
          aria-label="Country"
          className={FIELD}
        />

        {/* A street address resolves far more reliably than a business name —
            the road exists in OpenStreetMap even when the restaurant on it
            does not. */}
        <LocationLookup
          label="Find from this address"
          query={[address, city, country].filter(Boolean).join(", ")}
          hint={address.trim() ? undefined : "Add an address to search by it"}
          onPick={(hit) => {
            setLat(String(hit.lat));
            setLng(String(hit.lng));
            setNeighborhood((current) => current || hit.neighborhood || "");
            setCity((current) => current || hit.city || "");
            setCountry((current) => current || hit.country || "");
            setFound(hit.label);
          }}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="eyebrow">
          Coordinates <span className="normal-case">(required)</span>
        </p>
        <div className="flex gap-2">
          <input
            value={lat}
            onChange={(e) => {
              // Google copies a pin as "37.7531436, -122.5046807" — one string
              // for two fields. Splitting it here is the difference between
              // paste-and-done and paste, delete half, retype it in the box
              // next door.
              const pair = e.target.value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean);
              if (pair.length === 2 && pair.every((v) => Number.isFinite(Number(v)))) {
                setLat(pair[0]);
                setLng(pair[1]);
                return;
              }
              setLat(e.target.value);
            }}
            placeholder="Latitude"
            aria-label="Latitude"
            inputMode="decimal"
            className={FIELD}
          />
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Longitude"
            aria-label="Longitude"
            inputMode="decimal"
            className={FIELD}
          />
        </div>
        <p className="text-xs text-muted">
          Nothing found? In Google Maps, right-click the spot (or press and hold
          on a phone) and tap the numbers at the top — that copies them. Paste
          into Latitude and they&rsquo;ll split across both boxes.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium">Kind of place</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((category) => {
            const on = categories.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setCategories((current) =>
                    current.includes(category)
                      ? current.filter((c) => c !== category)
                      : [...current, category],
                  )
                }
                className={`pill font-medium transition-colors ${
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
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="qa-order" className="text-xs font-medium">
          What to get
        </label>
        <input
          id="qa-order"
          value={toOrder}
          onChange={(e) => setToOrder(e.target.value)}
          placeholder="The wings, and the fresh rolls"
          className={FIELD}
        />
      </div>

      <button
        type="button"
        aria-pressed={been}
        onClick={() => setBeen((on) => !on)}
        className="flex items-center gap-2 self-start text-sm font-medium"
      >
        <span
          aria-hidden
          className={`flex size-5 items-center justify-center rounded-sm border text-xs transition-colors ${
            been
              ? "border-accent bg-accent text-white"
              : "border-border text-transparent"
          }`}
        >
          ✓
        </span>
        I&rsquo;ve already been
      </button>

      {been && (
        <>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium">Go again?</span>
            <div className="flex flex-1 gap-1 rounded-md border border-border p-1">
              {(
                [
                  [true, "Yes"],
                  [false, "No"],
                  [null, "Unsure"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={again === value}
                  onClick={() => setAgain(value)}
                  className={`flex-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors ${
                    again === value
                      ? "bg-accent text-white"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="qa-review" className="text-xs font-medium">
              Review
            </label>
            <textarea
              id="qa-review"
              rows={4}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Fried hard, sauce on the side…"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="qa-when" className="text-xs font-medium">
              Went
            </label>
            <input
              id="qa-when"
              type="date"
              value={visitedOn}
              max={today()}
              onChange={(e) => setVisitedOn(e.target.value)}
              className={FIELD}
            />
          </div>

          <p className="text-xs text-muted">
            Photos are added from the place itself once it&rsquo;s on the map.
          </p>
        </>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-9 flex-1 rounded-md bg-accent-strong px-3 text-sm font-semibold text-white hover:bg-accent disabled:opacity-50"
        >
          {busy ? "Adding…" : been ? "Add and review" : "Add to the list"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-md px-3 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
