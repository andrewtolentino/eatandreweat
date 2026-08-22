import type { Place } from "./database.types";

/**
 * What a place's tag says.
 *
 * There is no score here, so this has to answer the two questions the original
 * spreadsheet asked — have I been, and was it worth it — in one word:
 *
 *   todo     not been yet. This is the to-do list, and most of the map.
 *   unsure   been, no verdict recorded. A real answer, not a missing one,
 *            which is why `again` is nullable.
 *   again    worth going back for.
 *   never    been, and not again.
 */
export type VerdictState = "todo" | "unsure" | "again" | "never";

export const VERDICT_LABELS: Record<VerdictState, string> = {
  todo: "Not yet",
  unsure: "Been, undecided",
  again: "Would go again",
  never: "Wouldn't go back",
};

/**
 * Verdict colour, picked from produce.
 *
 * These are the only saturated things on the page besides the photographs, and
 * they appear at small sizes — a dot in a tag — so they have to differ in
 * lightness as well as hue.
 */
export const VERDICT_COLORS: Record<VerdictState, string> = {
  again: "#2f7d4f",
  unsure: "#c98a2e",
  todo: "#a8c49a",
  never: "#6b3f7a",
};

export function verdictOf(place: Pick<Place, "been" | "again">): VerdictState {
  if (!place.been) return "todo";
  if (place.again === true) return "again";
  if (place.again === false) return "never";
  return "unsure";
}

/**
 * What the map shows, which is deliberately less than what a card shows.
 *
 * A pin answers one question — have I been here or not. The four-way verdict is
 * a judgement, and a map covered in ticks and crosses turns a list of places
 * into a scorecard. That detail stays on the card and in the panel, where you
 * have gone looking for it.
 */
export type PinState = "been" | "want";

export const PIN_LABELS: Record<PinState, string> = {
  been: "Been",
  want: "Want to go",
};
