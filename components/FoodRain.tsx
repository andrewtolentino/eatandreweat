"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Drop = {
  id: number;
  emoji: string;
  left: number;
  drift: number;
  rotation: number;
  scale: number;
  duration: number;
  delay: number;
};

type Shower = { key: number; drops: Drop[] };

const COUNT = 34;
const MAX_DURATION_MS = 3400;
const MAX_DELAY_MS = 1300;

/**
 * Drawn from the list itself — wings, ramen, hot pot, tacos, burgers, brunch.
 * A single repeated icon reads as a loading spinner; a mixed shower reads as
 * the map falling on you.
 */
const FOODS = ["🍗", "🍜", "🌮", "🍔", "🍟", "🥟", "🍲", "🧀", "🍳", "🥩"];

/** The one in the wordmark, so the button matches what it does. */
export const MARK = "🍗";

/**
 * Click the mark and it rains dinner down the whole page.
 *
 * Rendered through a portal on document.body: the sidebar card this lives in
 * has overflow:hidden, which would otherwise trap the whole shower inside a
 * 20rem box. Each drop spans the full viewport height, so it is positioned
 * against the window rather than the button.
 */
export function FoodRain() {
  const [showers, setShowers] = useState<Shower[]>([]);
  const seq = useRef(0);

  const rain = useCallback(() => {
    // Honour a stated preference for less motion — an easter egg is never worth
    // making someone feel ill.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const key = seq.current++;
    const drops: Drop[] = Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      emoji: FOODS[Math.floor(Math.random() * FOODS.length)],
      // Spread across the width, nudged off a perfect grid so it does not
      // read as a row of falling icons.
      left: (i / COUNT) * 100 + (Math.random() - 0.5) * (100 / COUNT) * 1.6,
      drift: (Math.random() - 0.5) * 120,
      rotation: (Math.random() - 0.5) * 720,
      scale: 0.6 + Math.random() * 1.1,
      // Varied speed is what sells depth; identical timing looks mechanical.
      duration: 1900 + Math.random() * (MAX_DURATION_MS - 1900),
      delay: Math.random() * MAX_DELAY_MS,
    }));

    setShowers((current) => [...current, { key, drops }]);

    window.setTimeout(
      () => setShowers((current) => current.filter((s) => s.key !== key)),
      MAX_DURATION_MS + MAX_DELAY_MS + 200,
    );
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={rain}
        aria-label="Dinner"
        title="Go on, click it"
        className="cursor-pointer text-3xl leading-none transition-transform active:scale-90"
      >
        {MARK}
      </button>

      {/* No "have we hydrated yet" guard, despite the portal needing a DOM to
          target: the only way showers is non-empty is that someone clicked the
          button, and a click cannot happen during the build-time prerender. By
          the time this branch is reachable, document.body exists. */}
      {showers.length > 0 &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          >
            {showers.map((shower) =>
              shower.drops.map((drop) => (
                <span
                  key={`${shower.key}-${drop.id}`}
                  className="food-drop"
                  style={
                    {
                      left: `${drop.left}%`,
                      "--drift": `${drop.drift}px`,
                      "--rot": `${drop.rotation}deg`,
                      "--scale": drop.scale,
                      animationDuration: `${drop.duration}ms`,
                      animationDelay: `${drop.delay}ms`,
                    } as React.CSSProperties
                  }
                >
                  {drop.emoji}
                </span>
              )),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
