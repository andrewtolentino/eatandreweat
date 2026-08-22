"use client";

import { useState } from "react";
import { supabase, isPermissionDenied } from "@/lib/supabase";
import { forgetDishPhoto, publicPhotoUrl, uploadDishPhoto } from "@/lib/photos";
import { formatDate } from "@/lib/format";
import type { DishWithState } from "@/lib/usePlaces";
import { VerdictChip } from "./VerdictChip";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const FIELD =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent";

/**
 * The write-up form. Everything about a dish is edited in one place, because
 * the answers are entangled: clearing "I've eaten this" has to clear the
 * verdict, the note and the photo with it, and doing that across three separate
 * inline controls would mean three chances to leave the row half-updated.
 */
function DishForm({
  dish,
  onSaved,
  onCancel,
}: {
  dish: DishWithState;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [eaten, setEaten] = useState(dish.eaten);
  const [again, setAgain] = useState<boolean | null>(dish.again);
  const [note, setNote] = useState(dish.note ?? "");
  const [eatenOn, setEatenOn] = useState(dish.eaten_on ?? today());
  const [file, setFile] = useState<File | null>(null);
  const [dropPhoto, setDropPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    // The database rejects a verdict on a dish you have not eaten, so the
    // client clears those fields rather than sending a row it knows will
    // bounce. Marking something un-eaten is a correction — it is meant to
    // take the write-up with it.
    if (!eaten) {
      const { error: clearError } = await supabase
        .from("dishes")
        .update({
          eaten: false,
          again: null,
          note: null,
          photo_path: null,
          eaten_on: null,
        })
        .eq("id", dish.id);

      setBusy(false);
      if (clearError) {
        setError(clearError.message);
        return;
      }
      forgetDishPhoto(dish.photo_path);
      onSaved();
      return;
    }

    let photoPath = dropPhoto ? null : dish.photo_path;

    if (file) {
      const uploaded = await uploadDishPhoto(dish.id, file);
      if ("error" in uploaded) {
        setBusy(false);
        setError(`Photo upload failed: ${uploaded.error}`);
        return;
      }
      photoPath = uploaded.path;
    }

    const { error: saveError } = await supabase
      .from("dishes")
      .update({
        eaten: true,
        again,
        note: note.trim() || null,
        photo_path: photoPath,
        eaten_on: eatenOn || null,
      })
      .eq("id", dish.id);

    setBusy(false);

    if (saveError) {
      setError(
        isPermissionDenied(saveError)
          ? "That account is not the author, so it cannot edit the map."
          : saveError.message,
      );
      return;
    }

    // Only once the row has stopped pointing at it.
    if (photoPath !== dish.photo_path) forgetDishPhoto(dish.photo_path);
    onSaved();
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 flex flex-col gap-4 rounded-md border border-border bg-background/40 p-3"
    >
      {/* A checkbox row, not a filled button: as a full-width accent bar this
          sat directly above the accent Save button and read as a second,
          competing action rather than as the state it is. */}
      <button
        type="button"
        aria-pressed={eaten}
        onClick={() => setEaten((on) => !on)}
        className="flex items-center gap-2 self-start text-sm font-medium text-foreground"
      >
        <span
          aria-hidden
          className={`flex size-5 items-center justify-center rounded-sm border text-xs transition-colors ${
            eaten
              ? "border-accent bg-accent text-white"
              : "border-border text-transparent"
          }`}
        >
          ✓
        </span>
        I&rsquo;ve eaten this
      </button>

      {eaten ? (
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
                      ? "bg-foreground text-background"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`note-${dish.id}`} className="text-xs font-medium">
              Write-up
            </label>
            <textarea
              id={`note-${dish.id}`}
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Fried hard, sauce on the side. Go before 9 or you're standing on Noriega…"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label htmlFor={`when-${dish.id}`} className="text-xs font-medium">
                Went
              </label>
              <input
                id={`when-${dish.id}`}
                type="date"
                value={eatenOn}
                max={today()}
                onChange={(e) => setEatenOn(e.target.value)}
                className={FIELD}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium">Photo</span>
              {/* The native file input renders its own button at its own height,
                  so it never lines up with the date field beside it. Hide it and
                  drive it from a label styled to match. */}
              <label
                htmlFor={`photo-${dish.id}`}
                className="flex h-9 w-full cursor-pointer items-center truncate rounded-md border border-border bg-background px-3 text-sm text-muted hover:border-accent"
              >
                <span className="truncate">
                  {file
                    ? file.name
                    : dish.photo_path && !dropPhoto
                      ? "Replace photo"
                      : "Choose photo"}
                </span>
              </label>
              <input
                id={`photo-${dish.id}`}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setDropPhoto(false);
                }}
                className="sr-only"
              />
            </div>
          </div>

          {dish.photo_path && !file && !dropPhoto && (
            <button
              type="button"
              onClick={() => setDropPhoto(true)}
              className="self-start text-xs text-muted underline underline-offset-2 hover:text-foreground"
            >
              Remove the photo
            </button>
          )}
          {dropPhoto && (
            <p className="text-xs text-muted">
              Photo will be removed when you save.{" "}
              <button
                type="button"
                onClick={() => setDropPhoto(false)}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Keep it
              </button>
            </p>
          )}
        </>
      ) : dish.eaten ? (
        <p className="text-xs text-muted">
          Saving now clears the verdict, the write-up and the photo — this dish
          goes back on the to-do list.
        </p>
      ) : (
        /* Nothing to warn about on a dish that was never eaten: the same
           message there ("saving clears the write-up") describes destroying
           something that does not exist. */
        <p className="text-xs text-muted">
          Tick the box once you&rsquo;ve been and the write-up opens up.
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

export function DishCard({
  dish,
  placeName,
  isAuthor,
  onChanged,
}: {
  dish: DishWithState;
  placeName: string;
  isAuthor: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  // Two-step delete rather than a window.confirm: same protection against a
  // stray click, without a modal dialog interrupting the page.
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function remove() {
    await supabase.from("dishes").delete().eq("id", dish.id);
    forgetDishPhoto(dish.photo_path);
    setConfirmDelete(false);
    onChanged();
  }

  return (
    <li className="rounded-md border border-border p-3">
      <div className="min-w-0">
        <p className="font-medium">{dish.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <VerdictChip state={dish.state} />
          {dish.eaten_on && (
            <span className="text-xs text-muted">{formatDate(dish.eaten_on)}</span>
          )}
        </div>
      </div>

      {dish.note && (
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">
          {dish.note}
        </p>
      )}

      {dish.photo_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={publicPhotoUrl(dish.photo_path)}
          alt={`${dish.name} at ${placeName}`}
          loading="lazy"
          className="mt-3 w-full rounded-md border border-border"
        />
      )}

      {isAuthor && !editing && (
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-hover"
          >
            {dish.eaten ? "Edit" : "Write it up"}
          </button>
          {confirmDelete ? (
            <>
              <span className="text-xs text-muted">Delete this dish?</span>
              <button
                onClick={remove}
                className="rounded-md border border-border px-2 py-0.5 text-xs font-medium hover:bg-surface-hover"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-muted hover:text-foreground"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-muted underline underline-offset-2 hover:text-foreground"
            >
              Delete
            </button>
          )}
        </div>
      )}

      {isAuthor && editing && (
        <DishForm
          dish={dish}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
    </li>
  );
}
