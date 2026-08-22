"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { PlaceWithDishes } from "@/lib/usePlaces";
import { PIN_LABELS } from "@/lib/verdict";
import { PinDot } from "./PinDot";

// Free, no API key, no signup, no billing account. Positron is the quietest of
// OpenFreeMap's styles — near-white land, grey water, no colour of its own —
// which is what lets four produce-coloured pins be the only saturated thing on
// the page.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

// See scripts/copy-maplibre-worker.mjs — MapLibre cannot find its own worker
// once bundled, so we serve it and hand over an absolute URL. Absolute matters:
// MapLibre resolves this against `import.meta.url`, which is not a usable base
// after bundling.
const WORKER_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/maplibre/maplibre-gl-worker.mjs`;

type Pin = { place: PlaceWithDishes; el: HTMLElement };

function PinButton({
  place,
  active,
  onSelect,
}: {
  place: PlaceWithDishes;
  active: boolean;
  onSelect: (place: PlaceWithDishes) => void;
}) {
  const state = place.been ? "been" : "want";

  return (
    <button
      type="button"
      aria-label={`${place.name} — ${PIN_LABELS[state]}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(place);
      }}
      className={`flex cursor-pointer items-center justify-center rounded-full transition-[scale] hover:scale-125 ${
        active ? "scale-[1.4]" : ""
      }`}
      style={{ zIndex: active ? 2 : undefined }}
    >
      <PinDot state={state} className="size-4" />
    </button>
  );
}

export function MapPanel({
  places,
  selectedId,
  focusId,
  onSelect,
  expanded = false,
  className = "",
}: {
  places: PlaceWithDishes[] | null;
  selectedId: string | null;
  /** Hovered in the feed or the list. Flies the map there without selecting. */
  focusId: string | null;
  onSelect: (place: PlaceWithDishes) => void;
  expanded?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  // MapLibre owns where each marker sits; React owns what is drawn inside it.
  // The alternative — building the pins as raw DOM and reaching back in to
  // restyle them on hover — means mutating nodes from an effect, and the
  // highlight state then lives in the DOM instead of in props.
  const [pins, setPins] = useState<Pin[]>([]);

  const fitAll = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !places?.length) return;

    const maplibregl = await import("maplibre-gl");
    const bounds = new maplibregl.LngLatBounds();
    for (const place of places) bounds.extend([place.lng, place.lat]);
    if (bounds.isEmpty()) return;

    map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 600 });
  }, [places]);

  // MapLibre touches `window` on import, and a static export prerenders this
  // component to HTML at build time, so it can only be imported in the browser.
  useEffect(() => {
    let map: MapLibreMap | null = null;
    let cancelled = false;

    (async () => {
      // MapLibre 6 ships named exports only — there is no default export.
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      maplibregl.setWorkerUrl(new URL(WORKER_URL, window.location.origin).href);

      const instance = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        // The whole world, since that is now the scope. fitBounds takes over as
        // soon as the places land.
        center: [0, 20],
        zoom: 1,
        attributionControl: { compact: true },
      });
      instance.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );

      map = instance;
      mapRef.current = instance;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // The panel changes size when it expands, and MapLibre sizes its canvas from
  // the container once. Without this the expanded map renders the small map's
  // pixels stretched across the screen.
  useEffect(() => {
    mapRef.current?.resize();
  }, [expanded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !places) return;

    let cancelled = false;
    let placed: Marker[] = [];

    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled) return;

      const bounds = new maplibregl.LngLatBounds();
      const next: Pin[] = [];

      for (const place of places) {
        // MapLibre positions this outer element with
        // `transform: translate(-50%,-50%) translate(xpx,ypx)`. Anything that
        // adds its own transform — including Tailwind's scale utilities, which
        // multiply the whole matrix — scales that pixel offset too and throws
        // the pin away from the cursor. So the outer element stays untouched
        // and every hover effect lives on the button portalled inside it.
        const el = document.createElement("div");
        placed.push(
          new maplibregl.Marker({ element: el })
            .setLngLat([place.lng, place.lat])
            .addTo(map),
        );
        next.push({ place, el });
        bounds.extend([place.lng, place.lat]);
      }

      setPins(next);

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 0 });
      }
    })();

    return () => {
      cancelled = true;
      placed.forEach((m) => m.remove());
      placed = [];
    };
  }, [ready, places]);

  // Flying on hover is the point of the feed↔map link, but it must not fight
  // the person. Only ever zooms in, never back out, so running the cursor down
  // a column of cards walks the map along instead of yo-yoing it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusId || !places) return;

    const place = places.find((p) => p.id === focusId);
    if (!place) return;

    map.easeTo({
      center: [place.lng, place.lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 700,
    });
  }, [focusId, places]);

  const active = focusId ?? selectedId;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* h-full rather than absolute inset-0: maplibre-gl.css sets
          .maplibregl-map{position:relative} and loads after Tailwind's
          utilities, so an `absolute` here loses and the map collapses to 0px. */}
      <div ref={containerRef} className="h-full w-full" />

      {pins.map(({ place, el }) =>
        createPortal(
          <PinButton
            place={place}
            active={place.id === active}
            onSelect={onSelect}
          />,
          el,
          place.id,
        ),
      )}

      {places && places.length > 1 && (
        <button
          onClick={fitAll}
          /* Top-left, not bottom-left: MapLibre pins its attribution to the
             bottom of the canvas and the two collided there. */
          className="absolute top-3 left-3 z-10 rounded-lg border border-border bg-surface/95 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur hover:bg-surface-hover"
        >
          Show everywhere
        </button>
      )}
    </div>
  );
}
