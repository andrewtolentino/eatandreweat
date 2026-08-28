"use client";

import { useState } from "react";
import type { PlaceWithVerdict } from "@/lib/usePlaces";
import { useAuth } from "@/lib/useAuth";
import { placeWhere } from "@/lib/database.types";
import { categoryLabel } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { PIN_LABELS } from "@/lib/verdict";
import { PinDot } from "./PinDot";
import { PhotoStrip } from "./PhotoStrip";
import { VerdictChip } from "./VerdictChip";
import { CategoryEditor } from "./CategoryEditor";
import { ReviewForm } from "./ReviewForm";
import { ReportGone } from "./ReportGone";
import { RemovePlace } from "./RemovePlace";

export function PlacePanel({
  place,
  onClose,
  onChanged,
  onRemoved,
  onViewPhotos,
}: {
  place: PlaceWithVerdict;
  onClose: () => void;
  /** Opens the full-screen viewer. Lives in Home so Escape can order itself. */
  onViewPhotos: (paths: string[], startAt: number) => void;
  /** Refetches the map, so a pin fills in the moment a review is saved. */
  onChanged: () => void;
  /** The place is gone — refetch *and* close, since there is nothing to show. */
  onRemoved: () => void;
}) {
  const { isAuthor } = useAuth();
  const [editing, setEditing] = useState(false);

  const mapsQuery = encodeURIComponent(
    [place.name, place.address, place.city, place.country]
      .filter(Boolean)
      .join(", "),
  );

  return (
    // A drawer over the whole page rather than a panel inside the map, because
    // it is opened from the feed as often as from a pin.
    <aside
      className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[26rem] sm:rounded-none sm:rounded-l-2xl"
      aria-label={`Details for ${place.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="display text-2xl leading-tight">{place.name}</h2>
          <p className="mt-1 text-sm text-muted">{placeWhere(place)}</p>
          {place.address && <p className="text-sm text-muted">{place.address}</p>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-1 shrink-0 rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="pill-bare gap-1.5">
          <PinDot state={place.been ? "been" : "want"} className="size-2.5" />
          {PIN_LABELS[place.been ? "been" : "want"]}
        </span>
        {place.been && <VerdictChip state={place.verdict} />}
        {place.visited_on && (
          <span className="pill-bare">{formatDate(place.visited_on)}</span>
        )}
      </div>

      {isAuthor ? (
        <CategoryEditor place={place} onChanged={onChanged} />
      ) : (
        place.categories &&
        place.categories.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {place.categories.map((c) => (
              <li key={c} className="pill">
                {categoryLabel(c)}
              </li>
            ))}
          </ul>
        )
      )}

      <section className="mt-5">
        <h3 className="eyebrow">What to get</h3>
        <p className="mt-1 text-sm">
          {place.to_order || (
            <span className="text-muted italic">Nothing picked yet.</span>
          )}
        </p>
      </section>

      <section className="mt-5">
        <h3 className="eyebrow">Review</h3>
        {place.review ? (
          <p className="mt-1 leading-relaxed whitespace-pre-line">
            {place.review}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted italic">
            {place.been ? "Been, not written up yet." : "Not been yet."}
          </p>
        )}
        {place.photo_paths.length > 0 && (
          // The same swipeable strip the cards use, so photos behave the same
          // way everywhere — and tapping one opens it full screen, since 26rem
          // is not a size at which you can actually look at a photograph.
          <PhotoStrip
            paths={place.photo_paths}
            alt={place.name}
            fit="contain"
            onOpen={(i) => onViewPhotos(place.photo_paths, i)}
            /* Portrait-leaning box, since phone photos are: a 4:5 frame holds a
               vertical shot almost exactly, and letterboxes a landscape one
               rather than beheading a portrait one. Nothing is cropped either
               way — contain is what makes that true. */
            className="mt-3 aspect-4/5 overflow-hidden rounded-md border border-border bg-surface-hover"
          />
        )}
      </section>

      {isAuthor &&
        (editing ? (
          <ReviewForm
            place={place}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              onChanged();
            }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="mt-4 self-start rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-hover"
          >
            {place.been ? "Edit review" : "Write a review"}
          </button>
        ))}

      {/* Separates the verdict from the practical details — where it is, how to
          get there — which are a different kind of information. */}
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

      {/* The author gets the real controls; everyone else gets the report box,
          which routes to the same decision through the review queue. */}
      {isAuthor ? (
        <RemovePlace place={place} onRemoved={onRemoved} />
      ) : (
        <ReportGone place={place} />
      )}
    </aside>
  );
}
