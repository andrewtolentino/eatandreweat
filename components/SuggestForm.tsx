"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { LocationLookup } from "./LocationLookup";

const FIELD =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent";

export function SuggestForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [dish, setDish] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  // Carried through from the lookup so approving does not have to geocode the
  // same query a second time.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [found, setFound] = useState<string | null>(null);
  const [submitterName, setSubmitterName] = useState("");
  const [note, setNote] = useState("");
  // Honeypot: hidden from people, irresistible to naive bots. Anything that
  // fills it gets a success screen and no database row.
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    if (website.trim()) {
      setBusy(false);
      setSent(true);
      return;
    }

    const { error: insertError } = await supabase.from("suggestions").insert({
      name: name.trim(),
      dish: dish.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      submitter_name: submitterName.trim() || null,
      note: note.trim() || null,
    });

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="display text-lg">Thanks — got it</h2>
          <p className="mt-1 text-sm text-muted">
            I read every suggestion. If it makes the cut it&rsquo;ll show up on
            the map as a hollow pin, and fill in once I&rsquo;ve been.
          </p>
        </div>
        <button
          onClick={onClose}
          className="h-9 rounded-md bg-accent-strong px-3 text-sm font-semibold text-white hover:bg-accent"
        >
          Back to the map
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="display text-lg">Suggest a spot</h2>
        <p className="mt-1 text-sm text-muted">
          Somewhere I should eat, and — just as important — the thing I should
          order when I get there.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="s-name" className="text-xs font-medium">
          Place <span className="text-muted">(required)</span>
        </label>
        <input
          id="s-name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Toyose"
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="s-dish" className="text-xs font-medium">
          What should I order?
        </label>
        <input
          id="s-dish"
          maxLength={120}
          value={dish}
          onChange={(e) => setDish(e.target.value)}
          placeholder="The wings"
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="s-city" className="text-xs font-medium">
          City or neighborhood
        </label>
        <input
          id="s-city"
          maxLength={80}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Outer Sunset, SF"
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="s-address" className="text-xs font-medium">
          Address <span className="text-muted">(or let me look it up)</span>
        </label>
        <input
          id="s-address"
          maxLength={200}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="3814 Noriega St"
          className={FIELD}
        />
        <LocationLookup
          query={[name, city].filter(Boolean).join(", ")}
          hint={name.trim() ? undefined : "Add the name first"}
          onPick={(hit) => {
            // Only fill what is still blank, so a lookup never overwrites
            // something typed deliberately.
            setAddress((current) => current || hit.address || "");
            setCity((current) => current || hit.city || "");
            setCountry((current) => current || hit.country || "");
            setCoords({ lat: hit.lat, lng: hit.lng });
            setFound(hit.label);
          }}
        />
        {found && (
          <p className="text-xs text-muted">
            Found: {found}{" "}
            <button
              type="button"
              onClick={() => {
                setCoords(null);
                setFound(null);
              }}
              className="underline decoration-border underline-offset-2 hover:decoration-foreground"
            >
              Not this one
            </button>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="s-country" className="text-xs font-medium">
          Country
        </label>
        <input
          id="s-country"
          maxLength={80}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Japan"
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="s-note" className="text-xs font-medium">
          Why should I go?
        </label>
        <textarea
          id="s-note"
          rows={3}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Open till 2am and they don't skimp on the sauce…"
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="s-from" className="text-xs font-medium">
          Your name <span className="text-muted">(optional)</span>
        </label>
        <input
          id="s-from"
          maxLength={80}
          value={submitterName}
          onChange={(e) => setSubmitterName(e.target.value)}
          className={FIELD}
        />
      </div>

      <div aria-hidden className="hidden">
        <label htmlFor="s-website">Leave this empty</label>
        <input
          id="s-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-9 flex-1 rounded-md bg-accent-strong px-3 text-sm font-semibold text-white hover:bg-accent disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send suggestion"}
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
