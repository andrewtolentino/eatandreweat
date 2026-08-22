/**
 * What kind of meal a place is for.
 *
 * An array on the place, not a single value, because the honest answer is
 * usually more than one: a café is coffee and breakfast and often a bakery, and
 * forcing it into one bucket makes every filter wrong.
 *
 * Stored as free text (`text[]`) rather than a Postgres enum. The list below is
 * what the filter offers and what the editor writes, but an enum would make
 * adding "market" or "wine bar" a migration, and this is exactly the kind of
 * list that grows. Anything stored that isn't here still displays, it just
 * doesn't get a chip.
 */
export const CATEGORIES = [
  "breakfast",
  "brunch",
  "lunch",
  "dinner",
  "late_night",
  "coffee",
  "tea",
  "bakery",
  "dessert",
  "bar",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  breakfast: "Breakfast",
  brunch: "Brunch",
  lunch: "Lunch",
  dinner: "Dinner",
  late_night: "Late night",
  coffee: "Coffee",
  tea: "Tea",
  bakery: "Bakery",
  dessert: "Dessert",
  bar: "Bar",
};

/** Sentence-case a value that predates the list above, so it still reads. */
export function categoryLabel(value: string): string {
  return (
    CATEGORY_LABELS[value as Category] ??
    value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
  );
}

/** True when the place matches every selected filter chip. */
export function matchesCategories(
  place: { categories: string[] | null },
  selected: string[],
): boolean {
  if (selected.length === 0) return true;
  const has = new Set(place.categories ?? []);
  // Every, not some: picking "coffee" and "bakery" should narrow to places that
  // are both, which is how someone would read two chips lit at once.
  return selected.every((c) => has.has(c));
}
