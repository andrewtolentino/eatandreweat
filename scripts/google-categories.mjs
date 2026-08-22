/**
 * Google's own place category is the best signal available for two questions
 * the importer has to answer: is this food, and what kind of meal is it for.
 *
 * Better than guessing from the name (a "Bake Sum" could be anything) and
 * better than Nominatim's OSM tags, which are patchier on small businesses.
 *
 * The mapping is an allowlist in both directions. A category that is known food
 * comes in with chips already set; a category that is known not-food is
 * rejected with a reason; anything unrecognised is *flagged*, never silently
 * included or dropped — a saved list is personal, and the cost of guessing
 * wrong in either direction is someone's actual dinner plans.
 */

const RESTAURANT = ["lunch", "dinner"];

/** Known food, with the chips each implies. */
export const FOOD_CATEGORIES = {
  // Rooms you sit down in
  restaurant: RESTAURANT,
  asian: RESTAURANT,
  chinese: RESTAURANT,
  filipino: RESTAURANT,
  italian: RESTAURANT,
  japanese: RESTAURANT,
  korean: RESTAURANT,
  mediterranean: RESTAURANT,
  mexican: RESTAURANT,
  "modern french": RESTAURANT,
  peruvian: RESTAURANT,
  seafood: RESTAURANT,
  steak: RESTAURANT,
  sushi: RESTAURANT,
  thai: RESTAURANT,
  "tonkatsu restaurant": RESTAURANT,
  turkish: RESTAURANT,
  pizza: RESTAURANT,
  "oyster bar": RESTAURANT,
  sandwich: ["lunch"],

  // Drink-led, but you eat there
  izakaya: ["dinner", "bar"],
  bar: ["bar"],
  "wine bar": ["bar"],
  "cocktail bar": ["bar"],
  pub: ["bar"],

  // Daytime
  cafe: ["coffee", "breakfast"],
  café: ["coffee", "breakfast"],
  "coffee shop": ["coffee"],
  "espresso bar": ["coffee"],
  "tea house": ["tea"],
  "bubble tea": ["tea"],
  bakery: ["bakery"],
  patisserie: ["bakery"],

  // Sweet
  "dessert shop": ["dessert"],
  "chocolate shop": ["dessert"],
  "candy store": ["dessert"],
  "ice cream shop": ["dessert"],
};

/** Known not-food. Rejected with the category named, so the call is auditable. */
export const NOT_FOOD = new Set([
  "photography studio",
  "jeans shop",
  "sportswear store",
  "clothing store",
  "fashion accessories store",
  "book store",
  "nail salon",
  "hair salon",
  "spa",
  "gym",
  "hotel",
  "park",
  "museum",
  "art gallery",
  "shoe store",
  "furniture store",
  "gift shop",
]);

/** Anything Google marks as shut, in the wordings it actually uses. */
export function isClosed(status = "") {
  return /permanently closed|temporarily closed|place no longer exists|closed/i.test(
    status,
  );
}

/**
 * → { ok: true, categories } | { ok: false, reason }
 */
export function classify(category = "") {
  const key = category.trim().toLowerCase();
  if (!key) return { ok: false, reason: "no category from Google" };

  const food = FOOD_CATEGORIES[key];
  if (food) return { ok: true, categories: food };

  if (NOT_FOOD.has(key)) return { ok: false, reason: `not food (${category})` };

  return {
    ok: false,
    reason: `unrecognised category "${category}" — food? add it to scripts/google-categories.mjs`,
  };
}
