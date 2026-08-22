"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PlaceWithDishes } from "@/lib/usePlaces";

/**
 * "This isn't there any more." A static list goes stale — menus change, places
 * close, and something can land here that never really had the dish — and one
 * person cannot re-check every menu.
 *
 * Deliberately not a verdict: it says nothing about whether the food was good,
 * it questions whether the pin belongs at all, so it goes to the review queue
 * rather than touching any tally.
 */
export function ReportGone({ place }: { place: PlaceWithDishes }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: insertError } = await supabase.from("suggestions").insert({
      kind: "gone",
      place_id: place.id,
      // The table requires a name, and carrying the place's own name keeps the
      // queue readable without a join.
      name: place.name,
      city: place.city,
      address: place.address,
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
      <p className="mt-4 rounded-md border border-border px-3 py-2 text-xs text-muted">
        Thanks — I&rsquo;ll check.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 text-xs text-muted underline underline-offset-2 hover:text-foreground"
      >
        Closed, or not on the menu any more? Let me know
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 flex flex-col gap-2 rounded-md border border-border p-3"
    >
      <label htmlFor={`report-${place.id}`} className="text-xs font-medium">
        What&rsquo;s changed at {place.name}?
      </label>
      <textarea
        id={`report-${place.id}`}
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Shut in the spring, or it's off the menu now…"
        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-8 flex-1 rounded-md bg-accent-strong px-3 text-xs font-semibold text-white hover:bg-accent disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send report"}
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
