import type { Dish } from "./database.types";

/**
 * What the map is actually showing.
 *
 * There is no score here, so a pin has to answer the two questions the sheet
 * asked — have I been, and was it worth it — in one glance. Four states cover
 * every combination of those two:
 *
 *   todo     not eaten yet. This is the to-do list, and most of the map starts
 *            here.
 *   unsure   eaten, no verdict recorded. A real answer, not a missing one,
 *            which is why `again` is nullable.
 *   again    worth going back for.
 *   never    eaten, and not again.
 */
export type VerdictState = "todo" | "unsure" | "again" | "never";

export const VERDICT_LABELS: Record<VerdictState, string> = {
  todo: "Not yet",
  unsure: "Been, undecided",
  again: "Would go again",
  never: "Wouldn't go back",
};

/**
 * The glyph on the pin and the row badge.
 *
 * Symbols rather than words: a pin is nine millimetres across, and a tick is
 * legible at that size where "Would go again" is not. The words are one tap
 * away in the panel, and in the legend for anyone who lands cold.
 */
export const VERDICT_MARKS: Record<VerdictState, string> = {
  todo: "○",
  unsure: "–",
  again: "✓",
  never: "✕",
};

/**
 * Pin colour, picked from produce.
 *
 * The page around it is paper and ink, so these four are the only saturated
 * things on screen and they have to read as a scale on sight — ripe herb green
 * for the ones worth going back to, through squash for undecided, down to
 * eggplant for the ones that aren't. `todo` is a pale cucumber: present but
 * quiet, because most of the map is to-do and a map of loud pins is a map you
 * cannot read.
 */
export const VERDICT_COLORS: Record<VerdictState, string> = {
  again: "#2f7d4f",
  unsure: "#c98a2e",
  todo: "#a8c49a",
  never: "#6b3f7a",
};

/**
 * Ink for a mark sitting on VERDICT_COLORS. The greens and the plum are dark
 * enough to carry white; squash and cucumber are not, and would fail contrast
 * outright with it. Every pairing here clears 4.5:1 against its own background,
 * which matters because these marks are small and bold.
 */
export function verdictInk(state: VerdictState): string {
  return state === "again" || state === "never" ? "#ffffff" : "#23200f";
}

export function verdictColor(state: VerdictState): string {
  return VERDICT_COLORS[state];
}

export function dishState(dish: Pick<Dish, "eaten" | "again">): VerdictState {
  if (!dish.eaten) return "todo";
  if (dish.again === true) return "again";
  if (dish.again === false) return "never";
  return "unsure";
}

/**
 * How good a state is, for rolling several dishes up into one pin.
 *
 * "never" ranks below "todo" on purpose: a place you have been to and would not
 * return to has been answered and failed, which is worse news than one you have
 * not tried yet.
 */
const RANK: Record<VerdictState, number> = {
  again: 3,
  unsure: 2,
  todo: 1,
  never: 0,
};

/**
 * What the map shows, which is deliberately not what a card shows.
 *
 * A pin answers one question — have I been here or not — and nothing else. The
 * four-way verdict is a judgement about a dish, and a map covered in ticks and
 * crosses turns a list of places into a scorecard. That detail stays on the
 * card and in the panel, where you have gone looking for it.
 */
/**
 * A place's verdict, rolled up from the dishes actually eaten there.
 *
 * The feed is a card per place now rather than per dish, so it needs one answer
 * where there may be several. "again" wins over "never" on purpose: one great
 * dish and one bad one is still somewhere worth going — you just order the
 * right thing, which is what the panel is for.
 */
export function eatenVerdict(
  dishes: { eaten: boolean; again: boolean | null }[],
): VerdictState {
  const eaten = dishes.filter((d) => d.eaten);
  if (eaten.length === 0) return "todo";
  if (eaten.some((d) => d.again === true)) return "again";
  if (eaten.some((d) => d.again === false)) return "never";
  return "unsure";
}

export type PinState = "been" | "want";

export const PIN_LABELS: Record<PinState, string> = {
  been: "Been",
  want: "Want to go",
};

export function rankOf(state: VerdictState): number {
  return RANK[state];
}

/**
 * A place shows its best dish. One great dish and one bad one is still a place
 * worth going to — you just order the right thing, which is what the panel is
 * for.
 */
export function placeState(states: VerdictState[]): VerdictState {
  if (states.length === 0) return "todo";
  return states.reduce((best, s) => (RANK[s] > RANK[best] ? s : best), "never");
}
