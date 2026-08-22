"use client";

import { useState } from "react";
import type { PlaceWithVerdict } from "@/lib/usePlaces";
import { useAuth } from "@/lib/useAuth";
import { placeWhere } from "@/lib/database.types";
import { categoryLabel } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { publicPhotoUrl } from "@/lib/photos";
import { PIN_LABELS } from "@/lib/verdict";
import { PinDot } from "./PinDot";
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
}: {
  place: PlaceWithVerdict;
  onClose: () => void;
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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-muted">
          <PinDot state={place.been ? "been" : "want"} className="size-3" />
          {PIN_LABELS[place.been ? "been" : "want"]}
        </span>
        {place.been && <VerdictChip state={place.verdict} />}
        {place.visited_on && (
          <span className="text-xs text-muted">{formatDate(place.visited_on)}</span>
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
        {place.photo_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicPhotoUrl(place.photo_path)}
            alt={place.name}
            loading="lazy"
            className="mt-3 w-full rounded-md border border-border"
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
