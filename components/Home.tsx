"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { toFeed, usePlaces, type PlaceWithDishes } from "@/lib/usePlaces";
import { CATEGORIES, matchesCategories } from "@/lib/categories";
import { useAuth } from "@/lib/useAuth";
import { PIN_LABELS, type PinState } from "@/lib/verdict";
import { PinDot } from "./PinDot";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { Feed } from "./Feed";
import { CategoryFilter } from "./CategoryFilter";
import { WantList, wantToGo } from "./WantList";
import { MapPanel } from "./MapPanel";
import { PlaceList } from "./PlaceList";
import { PlacePanel } from "./PlacePanel";
import { SuggestForm } from "./SuggestForm";
import { SuggestionsQueue } from "./SuggestionsQueue";

/** Two states, so the key is two swatches. */
const LEGEND: PinState[] = ["been", "want"];

function Legend({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 ${className}`}>
      {LEGEND.map((state) => (
        <li
          key={state}
          className="flex items-center gap-1.5 text-[11px] text-muted"
        >
          <PinDot state={state} className="size-3" />
          {PIN_LABELS[state]}
        </li>
      ))}
    </ul>
  );
}

/**
 * Hovering a card flies the map, so the raw pointer signal has to be smoothed
 * before it gets there — scrolling a column of cards under the cursor otherwise
 * fires a dozen camera animations that fight each other. A short delay means
 * only the card you actually settled on moves the map.
 */
function useSettledHover(delayMs = 180): [string | null, (id: string | null) => void] {
  const [raw, setRaw] = useState<string | null>(null);
  const [settled, setSettled] = useState<string | null>(null);

  useEffect(() => {
    // Clearing is immediate; only arriving somewhere waits.
    if (raw === null) return;
    const timer = window.setTimeout(() => setSettled(raw), delayMs);
    return () => window.clearTimeout(timer);
  }, [raw, delayMs]);

  return [settled, setRaw];
}

export function Home({ year }: { year: number }) {
  const { places, error, loading, reload } = usePlaces();
  const { isAuthor } = useAuth();

  const [tab, setTab] = useState<"recent" | "want">("recent");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHover] = useSettledHover();
  const [mapExpanded, setMapExpanded] = useState(false);
  const [overlay, setOverlay] = useState<null | "suggest" | "queue">(null);

  // Held by id rather than by object: reload() builds fresh place objects, and
  // a drawer holding the old one would keep showing a stale write-up after an
  // edit is saved.
  const selected = places?.find((p) => p.id === selectedId) ?? null;

  // The filter narrows everything at once — feed, list and pins. Filtering only
  // the column you are reading would leave the map showing places the list has
  // just hidden, and the two are meant to be the same set seen two ways.
  const shown = useMemo(
    () => (places ?? []).filter((p) => matchesCategories(p, categories)),
    [places, categories],
  );

  const feed = useMemo(() => toFeed(shown), [shown]);
  const want = useMemo(() => wantToGo(shown), [shown]);

  /**
   * What each chip would leave *given the chips already lit*, so the counts
   * describe the next click rather than the whole database.
   */
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const category of CATEGORIES) {
      out[category] = (places ?? []).filter((p) =>
        matchesCategories(p, [...new Set([...categories, category])]),
      ).length;
    }
    return out;
  }, [places, categories]);

  const count = places?.length ?? 0;
  const todo = places?.filter((p) => !p.been).length ?? 0;

  const select = useCallback((place: PlaceWithDishes) => {
    setSelectedId(place.id);
  }, []);

  // Escape closes whatever is on top, innermost first.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (overlay) setOverlay(null);
      else if (selectedId) setSelectedId(null);
      else if (mapExpanded) setMapExpanded(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, selectedId, mapExpanded]);

  return (
    <div className="min-h-dvh">
      <SiteHeader
        count={count}
        todo={todo}
        loading={loading}
        isAuthor={isAuthor}
        onSuggest={() => setOverlay("suggest")}
        onReview={() => setOverlay("queue")}
      />

      {error && (
        <div className="mt-4 px-6">
          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-medium">Could not load the map</p>
            <p className="mt-1 text-muted">{error}</p>
            <button
              onClick={reload}
              className="mt-3 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-hover"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto grid max-w-[92rem] gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {/* The map comes first in source order so it lands above the feed on a
            phone — a strip you can glance at — but the grid puts it in the
            right rail from lg up, where the feed is the thing you read. */}
        <aside className="lg:order-2">
          <div className="lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <MapPanel
                places={places === null ? null : shown}
                selectedId={selectedId}
                focusId={hoverId}
                onSelect={select}
                className="h-64 lg:h-[28rem]"
              />
              <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
                <Legend />
                <button
                  onClick={() => setMapExpanded(true)}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-hover"
                >
                  Expand
                </button>
              </div>
            </div>
            <p className="mt-2 px-1 text-xs text-muted">
              Hover a write-up to fly the map there. Expand it to browse
              everywhere at once.
            </p>
          </div>
        </aside>

        <div className="lg:order-1">
          <div className="mb-4 flex flex-col gap-3">
            <div
              role="tablist"
              aria-label="What to show"
              className="flex gap-1 self-start rounded-lg border border-border bg-surface p-1"
            >
              {(
                [
                  ["recent", `Recently${feed.length ? ` (${feed.length})` : ""}`],
                  ["want", `Want to go${want.length ? ` (${want.length})` : ""}`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === key
                      ? "bg-foreground text-background"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <CategoryFilter
              selected={categories}
              onChange={setCategories}
              counts={counts}
            />
          </div>

          {loading ? (
            <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
              Loading…
            </p>
          ) : tab === "recent" ? (
            <Feed
              entries={feed}
              selectedId={selectedId}
              onSelect={select}
              onHover={setHover}
            />
          ) : (
            <WantList
              places={want}
              selectedId={selectedId}
              onSelect={select}
              onHover={setHover}
              onSuggest={() => setOverlay("suggest")}
            />
          )}
        </div>
      </main>

      <SiteFooter year={year} />

      {/* The expanded map: the whole viewport, with the full list beside it.
          This is the "discover more" mode — everywhere at once, including the
          places with nothing written up, which never appear in the feed. */}
      {mapExpanded && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
            <h2 className="display text-lg">Everywhere</h2>
            <button
              onClick={() => setMapExpanded(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover"
            >
              Close map
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
            <div className="min-h-0 w-full overflow-y-auto border-border bg-surface lg:w-80 lg:border-r">
              {places && (
                <PlaceList
                  places={shown}
                  selectedId={selectedId}
                  onSelect={select}
                  onHover={setHover}
                />
              )}
            </div>
            <MapPanel
              places={places === null ? null : shown}
              selectedId={selectedId}
              focusId={hoverId}
              onSelect={select}
              expanded
              className="h-1/2 w-full lg:h-auto lg:flex-1"
            />
          </div>
        </div>
      )}

      {selected && (
        <>
          <button
            aria-label="Close details"
            onClick={() => setSelectedId(null)}
            className="fixed inset-0 z-40 bg-foreground/25"
          />
          <PlacePanel
            /* Selecting another place swaps this component's props without
               remounting it, so any state inside survives the switch — a
               submitted report kept showing its thank-you on every other place.
               Keying by id makes each place a fresh panel. */
            key={selected.id}
            place={selected}
            onClose={() => setSelectedId(null)}
            onChanged={reload}
            onRemoved={() => {
              setSelectedId(null);
              reload();
            }}
          />
        </>
      )}

      {overlay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            aria-label="Close"
            onClick={() => setOverlay(null)}
            className="absolute inset-0 bg-foreground/25"
          />
          <div className="relative max-h-[85svh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
            {overlay === "suggest" ? (
              <SuggestForm onClose={() => setOverlay(null)} />
            ) : (
              <SuggestionsQueue
                onClose={() => setOverlay(null)}
                onApproved={reload}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
