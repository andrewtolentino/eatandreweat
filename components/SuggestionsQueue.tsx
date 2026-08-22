"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { LocationLookup } from "./LocationLookup";
import { slugify } from "@/lib/slug";
import { useSuggestions } from "@/lib/useSuggestions";
import type { Suggestion } from "@/lib/database.types";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

const FIELD =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent";

/** Approving needs coordinates, which a suggestion never carries. */
function ApproveForm({
  suggestion,
  onDone,
  onCancel,
}: {
  suggestion: Suggestion;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(suggestion.name);
  const [toOrder, setToOrder] = useState(suggestion.dish ?? "");
  const [address, setAddress] = useState(suggestion.address ?? "");
  const [city, setCity] = useState(suggestion.city ?? "");
  const [neighborhood, setNeighborhood] = useState("");
  const [country, setCountry] = useState(suggestion.country ?? "");
  const [categories, setCategories] = useState<string[]>([]);
  // Pre-filled when the suggest form already looked the place up, which is the
  // common case for your own bookmarks — approving is then one click.
  const [lat, setLat] = useState(suggestion.lat != null ? String(suggestion.lat) : "");
  const [lng, setLng] = useState(suggestion.lng != null ? String(suggestion.lng) : "");
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setSaving(true);
    setError(null);

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setSaving(false);
      setError("Coordinates are required — look them up or paste them in.");
      return;
    }

    const { data: place, error: placeError } = await supabase
      .from("places")
      .insert({
        slug: `${slugify(name)}-${Date.now().toString(36).slice(-4)}`,
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        neighborhood: neighborhood.trim() || null,
        country: country.trim() || null,
        categories,
        // Straight onto the place now — what to get is a field, not a row.
        to_order: toOrder.trim() || null,
        lat: latitude,
        lng: longitude,
      })
      .select("id")
      .single();

    if (placeError || !place) {
      setSaving(false);
      setError(placeError?.message ?? "Could not create the place.");
      return;
    }

    await supabase
      .from("suggestions")
      .update({ status: "approved" })
      .eq("id", suggestion.id);

    setSaving(false);
    onDone();
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">
          What to get <span className="text-muted">(optional)</span>
        </label>
        <input
          value={toOrder}
          onChange={(e) => setToOrder(e.target.value)}
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Address</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} className={FIELD} />
      </div>

      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label className="text-xs font-medium">City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={FIELD} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label className="text-xs font-medium">Neighborhood</label>
          <input
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className={FIELD}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Country</label>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Japan"
          className={FIELD}
        />
      </div>

      {/* Set here rather than left for later: a place with no categories is
          invisible to every filter chip on the front page. */}
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

      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label className="text-xs font-medium">Latitude</label>
          <input value={lat} onChange={(e) => setLat(e.target.value)} className={FIELD} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label className="text-xs font-medium">Longitude</label>
          <input value={lng} onChange={(e) => setLng(e.target.value)} className={FIELD} />
        </div>
      </div>

      <LocationLookup
        query={[name, address, city, country].filter(Boolean).join(", ")}
        onPick={(hit) => {
          // Coordinates always win here — they are the thing being looked up.
          // The text fields only fill where they are still blank.
          setLat(String(hit.lat));
          setLng(String(hit.lng));
          setAddress((current) => current || hit.address || "");
          setNeighborhood((current) => current || hit.neighborhood || "");
          setCity((current) => current || hit.city || "");
          setCountry((current) => current || hit.country || "");
          setLookupNote(hit.label);
        }}
      />

      {lookupNote && <p className="text-xs text-muted">{lookupNote}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={approve}
          disabled={saving}
          className="h-9 flex-1 rounded-md bg-accent-strong px-3 text-sm font-semibold text-white hover:bg-accent disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add to map"}
        </button>
        <button
          onClick={onCancel}
          className="h-9 rounded-md px-3 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function SuggestionsQueue({
  onClose,
  onApproved,
}: {
  onClose: () => void;
  onApproved: () => void;
}) {
  const { suggestions, reload } = useSuggestions(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  /** Report confirmed: retire the place, keeping its row and any write-ups. */
  async function removeFromMap(suggestion: Suggestion) {
    if (suggestion.place_id) {
      await supabase
        .from("places")
        .update({ status: "dropped" })
        .eq("id", suggestion.place_id);
    }
    await supabase
      .from("suggestions")
      .update({ status: "approved" })
      .eq("id", suggestion.id);
    reload();
    onApproved();
  }

  async function reject(id: string) {
    await supabase.from("suggestions").update({ status: "rejected" }).eq("id", id);
    reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="display text-lg">Suggestions</h2>
          <p className="mt-1 text-sm text-muted">
            {suggestions === null ? "Loading…" : `${suggestions.length} waiting`}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-1 rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {suggestions?.length === 0 && (
        <p className="rounded-md border border-border px-3 py-6 text-center text-sm text-muted">
          Nothing pending.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {(suggestions ?? []).map((suggestion) => (
          <li key={suggestion.id} className="rounded-md border border-border p-3">
            {suggestion.kind === "gone" && (
              <p className="mb-1 inline-block rounded-md bg-surface-hover px-1.5 py-0.5 text-xs font-medium text-muted">
                Reported: gone
              </p>
            )}
            <p className="font-medium">{suggestion.name}</p>
            {suggestion.dish && (
              <p className="text-sm text-muted">Get: {suggestion.dish}</p>
            )}
            <p className="text-xs text-muted">
              {[suggestion.address, suggestion.city].filter(Boolean).join(" · ") ||
                "No address given"}
            </p>
            {suggestion.note && (
              <p className="mt-2 text-sm text-muted">{suggestion.note}</p>
            )}

            {suggestion.kind === "gone" && (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(
                  [suggestion.name, suggestion.city, "menu"]
                    .filter(Boolean)
                    .join(" "),
                )}`}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-block text-xs underline decoration-border underline-offset-2 hover:decoration-foreground"
              >
                Check their menu →
              </a>
            )}
            {suggestion.submitter_name && (
              <p className="mt-1 text-xs text-muted">
                — {suggestion.submitter_name}
              </p>
            )}

            {approvingId === suggestion.id ? (
              <ApproveForm
                suggestion={suggestion}
                onCancel={() => setApprovingId(null)}
                onDone={() => {
                  setApprovingId(null);
                  reload();
                  onApproved();
                }}
              />
            ) : (
              <div className="mt-3 flex gap-2">
                {suggestion.kind === "gone" ? (
                  <button
                    onClick={() => removeFromMap(suggestion)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-hover"
                  >
                    Take off the map
                  </button>
                ) : (
                  <button
                    onClick={() => setApprovingId(suggestion.id)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-hover"
                  >
                    Add to map
                  </button>
                )}
                <button
                  onClick={() => reject(suggestion.id)}
                  className="rounded-md px-2.5 py-1 text-xs text-muted hover:text-foreground"
                >
                  {suggestion.kind === "gone" ? "Still there" : "Dismiss"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
