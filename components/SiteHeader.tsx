"use client";

import { SITE_BLURB, SITE_NAME } from "@/lib/site";
import { FoodRain } from "./FoodRain";

export function SiteHeader({
  count,
  todo,
  loading,
  isAuthor,
  onAdd,
  onSuggest,
  onReview,
}: {
  count: number;
  todo: number;
  loading: boolean;
  isAuthor: boolean;
  onAdd: () => void;
  onSuggest: () => void;
  onReview: () => void;
}) {
  const subtitle = loading
    ? "Loading…"
    : `${count} place${count === 1 ? "" : "s"} · ${todo} still to eat`;

  return (
    // Full-bleed rather than a centred column. The bar reads as the top of the
    // window, so capping its contents at the width of the article column left
    // the wordmark and the button stranded in the middle of a wide screen with
    // empty margins either side.
    <header className="border-b border-border bg-surface">
      <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <h1 className="display flex items-center gap-2 text-3xl leading-none">
            <FoodRain />
            {SITE_NAME}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
            {SITE_BLURB}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {/* Filled, and first: for the author this is the action, and the
              moment it matters is standing outside somewhere with a phone. */}
          {isAuthor && (
            <button
              onClick={onAdd}
              className="rounded-lg bg-accent-strong px-3 py-2 text-xs font-semibold text-white hover:bg-accent"
            >
              + Add a place
            </button>
          )}
          <button
            onClick={onSuggest}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-hover"
          >
            Suggest a spot
          </button>
          {isAuthor && (
            <button
              onClick={onReview}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-hover"
            >
              Review
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
