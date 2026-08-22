"use client";

import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

/**
 * Chips, not a dropdown. There are nine of them and the whole point is to see
 * at a glance what is currently narrowing the list — a select box hides its own
 * state behind a click.
 */
export function CategoryFilter({
  selected,
  onChange,
  counts,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  /** How many places each chip would leave. Zero-count chips are dimmed. */
  counts: Record<string, number>;
}) {
  function toggle(category: string) {
    onChange(
      selected.includes(category)
        ? selected.filter((c) => c !== category)
        : [...selected, category],
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {CATEGORIES.map((category) => {
        const on = selected.includes(category);
        const count = counts[category] ?? 0;
        return (
          <button
            key={category}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(category)}
            // Dimmed rather than hidden when nothing matches: a chip that
            // disappears as you filter makes the row jump under the cursor.
            className={`pill font-medium transition-colors ${
              on
                ? "border-accent! bg-accent text-white!"
                : count === 0
                  ? "text-muted/50"
                  : "hover:border-accent! hover:text-accent!"
            }`}
          >
            {CATEGORY_LABELS[category]}
          </button>
        );
      })}

      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="ml-1 text-xs text-muted underline decoration-border underline-offset-2 hover:decoration-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}
