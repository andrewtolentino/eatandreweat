"use client";

import { useState } from "react";
import { supabase, isPermissionDenied } from "@/lib/supabase";
import { forgetPlacePhotos } from "@/lib/photos";
import type { PlaceWithVerdict } from "@/lib/usePlaces";

/**
 * Author-only. Two ways off the map, because they are genuinely different acts
 * and collapsing them into one "delete" loses something either way.
 *
 * Taking it off keeps the row: the place is remembered as considered, so it
 * does not get re-suggested and re-added in six months, and any write-up you
 * left while it was still open survives as the record of a real meal. That is
 * the right answer for somewhere that closed.
 *
 * Deleting is for mistakes — a duplicate, a wrong pin, somewhere added and
 * thought better of. It takes the review and photo with it and cannot be
 * undone from here.
 */
export function RemovePlace({
  place,
  onRemoved,
}: {
  place: PlaceWithVerdict;
  onRemoved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasReview = Boolean(place.review);

  function report(saveError: { code?: string; message: string } | null) {
    setBusy(false);
    if (saveError) {
      setError(
        isPermissionDenied(saveError)
          ? "That account is not the author, so it cannot edit the map."
          : saveError.message,
      );
      return false;
    }
    return true;
  }

  async function takeOff(status: "closed" | "dropped") {
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("places")
      .update({ status })
      .eq("id", place.id);
    if (report(error)) onRemoved();
  }

  async function destroy() {
    setBusy(true);
    setError(null);
    // Storage lives outside Postgres and nothing cascades to it, so the photos
    // have to be swept explicitly — and only once the row naming them is gone.
    const photos = place.photo_paths;
    const { error } = await supabase.from("places").delete().eq("id", place.id);
    if (report(error)) {
      forgetPlacePhotos(photos);
      onRemoved();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 text-xs text-muted underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-foreground"
      >
        Remove this place
      </button>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-md border border-border p-3">
      <div>
        <p className="text-xs font-medium">Remove {place.name}</p>
        <p className="mt-1 text-xs text-muted">
          {hasReview ? "There's a review here." : "Nothing written up here."}
        </p>
      </div>

      <button
        onClick={() => takeOff("closed")}
        disabled={busy}
        className="rounded-md border border-border px-2.5 py-1.5 text-left text-xs font-medium hover:bg-surface-hover disabled:opacity-50"
      >
        It&rsquo;s closed
        <span className="block font-normal text-muted">
          Off the map, write-ups kept.
        </span>
      </button>

      <button
        onClick={() => takeOff("dropped")}
        disabled={busy}
        className="rounded-md border border-border px-2.5 py-1.5 text-left text-xs font-medium hover:bg-surface-hover disabled:opacity-50"
      >
        Doesn&rsquo;t belong here
        <span className="block font-normal text-muted">
          Off the map, and it won&rsquo;t come back via a suggestion.
        </span>
      </button>

      {confirmDelete ? (
        <div className="rounded-md border border-danger/40 p-2.5">
          <p className="text-xs">
            Delete permanently? This erases the place
            {hasReview && ", its review"} and any photos. It cannot be undone.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={destroy}
              disabled={busy}
              className="rounded-md bg-danger px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted hover:text-foreground"
            >
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={busy}
          className="rounded-md px-2.5 py-1.5 text-left text-xs text-danger hover:underline disabled:opacity-50"
        >
          Delete permanently
          <span className="block text-muted">
            For mistakes and duplicates. Erases everything.
          </span>
        </button>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        onClick={() => {
          setOpen(false);
          setConfirmDelete(false);
        }}
        className="self-start text-xs text-muted hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}
