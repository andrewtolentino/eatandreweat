import {
  VERDICT_COLORS,
  VERDICT_LABELS,
  type VerdictState,
} from "@/lib/verdict";

/**
 * The verdict, at the weight it deserves.
 *
 * It used to be a large coloured badge in the corner of every card, which made
 * the front page read as a review site — the first thing you saw about a meal
 * was its score. Here it sits in the row of tags at the foot of the card, the
 * same size as "Bakery" or "Coffee": available, not announced.
 */
export function VerdictChip({ state }: { state: VerdictState }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: VERDICT_COLORS[state] }}
      />
      {VERDICT_LABELS[state]}
    </span>
  );
}
