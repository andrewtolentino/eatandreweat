"use client";

import { useState } from "react";
import { supabase, isPermissionDenied } from "@/lib/supabase";
import { forgetPlacePhotos, publicPhotoUrl, uploadPlacePhotos } from "@/lib/photos";
import type { PlaceWithVerdict } from "@/lib/usePlaces";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const FIELD =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent";

/**
 * The whole opinion of a place, edited in one place.
 *
 * One form rather than several inline controls, because the answers are
 * entangled: clearing "I've been" has to clear the verdict, the review, the
 * date and the photo with it, and spreading that across separate controls would
 * mean several chances to leave the row half-updated.
 *
 * "What to get" sits above the visit fields on purpose — it is the one thing
 * worth recording about somewhere you have *not* been, and the database lets it
 * stand alone for exactly that reason.
 */
export function ReviewForm({
  place,
  onSaved,
  onCancel,
}: {
  place: PlaceWithVerdict;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [toOrder, setToOrder] = useState(place.to_order ?? "");
  const [been, setBeen] = useState(place.been);
  const [again, setAgain] = useState<boolean | null>(place.again);
  const [review, setReview] = useState(place.review ?? "");
  const [visitedOn, setVisitedOn] = useState(place.visited_on ?? today());
  // Existing photos you have chosen to keep, plus new files not yet uploaded.
  // Removal is staged rather than immediate so Cancel really cancels.
  const [keptPhotos, setKeptPhotos] = useState<string[]>(place.photo_paths);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    // The database rejects a verdict on somewhere you have not been, so the
    // client clears those fields rather than sending a row it knows will
    // bounce. Un-ticking "I've been" is a correction — it is meant to take the
    // review with it. `to_order` survives: it was never about having been.
    if (!been) {
      const { error: clearError } = await supabase
        .from("places")
        .update({
          been: false,
          again: null,
          review: null,
          photo_paths: [],
          visited_on: null,
          to_order: toOrder.trim() || null,
        })
        .eq("id", place.id);

      setBusy(false);
      if (clearError) {
        setError(clearError.message);
        return;
      }
      forgetPlacePhotos(place.photo_paths);
      onSaved();
      return;
    }

    let photoPaths = keptPhotos;

    if (newFiles.length > 0) {
      const uploaded = await uploadPlacePhotos(place.id, newFiles);
      photoPaths = [...keptPhotos, ...uploaded.paths];

      if (uploaded.error) {
        setBusy(false);
        setError(
          `${uploaded.paths.length} of ${newFiles.length} photos uploaded, then: ${uploaded.error}. Save again to keep the ones that worked.`,
        );
        // Keep what landed so a retry does not re-upload them.
        setKeptPhotos(photoPaths);
        setNewFiles([]);
        return;
      }
    }

    const { error: saveError } = await supabase
      .from("places")
      .update({
        been: true,
        again,
        review: review.trim() || null,
        to_order: toOrder.trim() || null,
        photo_paths: photoPaths,
        visited_on: visitedOn || null,
      })
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

    // Only once the row has stopped pointing at them.
    forgetPlacePhotos(place.photo_paths.filter((p) => !photoPaths.includes(p)));
    onSaved();
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 flex flex-col gap-4 rounded-md border border-border bg-background/40 p-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`order-${place.id}`} className="text-xs font-medium">
          What to get
        </label>
        <input
          id={`order-${place.id}`}
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
        I&rsquo;ve been
      </button>

      {been ? (
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
            <label htmlFor={`review-${place.id}`} className="text-xs font-medium">
              Review
            </label>
            <textarea
              id={`review-${place.id}`}
              rows={5}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Fried hard, sauce on the side, and they actually do it when you ask…"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label htmlFor={`when-${place.id}`} className="text-xs font-medium">
                Went
              </label>
              <input
                id={`when-${place.id}`}
                type="date"
                value={visitedOn}
                max={today()}
                onChange={(e) => setVisitedOn(e.target.value)}
                className={FIELD}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">
              Photos{" "}
              <span className="text-muted">
                — the food, the room, whatever you took
              </span>
            </span>

            {(keptPhotos.length > 0 || newFiles.length > 0) && (
              <ul className="flex flex-wrap gap-2">
                {keptPhotos.map((path) => (
                  <li key={path} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publicPhotoUrl(path)}
                      alt=""
                      className="size-16 rounded-md border border-border object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove this photo"
                      onClick={() =>
                        setKeptPhotos((current) =>
                          current.filter((p) => p !== path),
                        )
                      }
                      className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-surface text-xs shadow-sm hover:bg-surface-hover"
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {newFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex size-16 items-center justify-center rounded-md border border-dashed border-border p-1 text-center text-[10px] break-all text-muted"
                  >
                    {f.name.slice(0, 22)}
                  </li>
                ))}
              </ul>
            )}

            <label
              htmlFor={`photos-${place.id}`}
              className="flex h-9 w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-border text-sm text-muted hover:border-accent hover:text-foreground"
            >
              {newFiles.length > 0
                ? `${newFiles.length} to upload — add more`
                : "Add photos"}
            </label>
            <input
              id={`photos-${place.id}`}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                // Appended, not replaced: picking a second time on a phone is
                // usually "and these too", not "actually, these instead".
                const picked = Array.from(e.target.files ?? []);
                setNewFiles((current) => [...current, ...picked]);
                e.target.value = "";
              }}
              className="sr-only"
            />
          </div>

        </>
      ) : place.been ? (
        <p className="text-xs text-muted">
          Saving now clears the verdict, the review, the date and the photo —
          this goes back on the to-do list. What to get is kept.
        </p>
      ) : (
        <p className="text-xs text-muted">
          Tick the box once you&rsquo;ve been and the review opens up.
        </p>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-9 flex-1 rounded-md bg-accent-strong px-3 text-sm font-semibold text-white hover:bg-accent disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-md px-3 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
