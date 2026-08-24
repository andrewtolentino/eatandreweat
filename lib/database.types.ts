// Hand-maintained to match supabase/migrations/. If the schema changes, update
// this too — or generate it with:
//   npx supabase gen types typescript --project-id <your-project-id>

export type PlaceStatus = "open" | "closed" | "dropped";

export type Place = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  /**
   * Free text, not an enum. The list started as five Bay Area regions, which
   * stopped being a model of anything the first time somewhere outside
   * California went on it. A column that can hold "Japan" without a migration
   * is worth more than one the database can validate.
   */
  country: string | null;
  /** See lib/categories.ts — free text, multiple per place. */
  categories: string[] | null;
  /** Have I been. */
  been: boolean;
  /** null while undecided, which is a real answer and not a missing one. */
  again: boolean | null;
  review: string | null;
  /** What to get. Free text — "the pot pie, and the Double Down for the bit". */
  to_order: string | null;
  /** Display order is array order; new photos append. */
  photo_paths: string[];
  visited_on: string | null;
  lat: number;
  lng: number;
  website: string | null;
  status: PlaceStatus;
  created_at: string;
};

export type SuggestionKind = "new_place" | "gone";

export type Suggestion = {
  id: string;
  kind: SuggestionKind;
  place_id: string | null;
  name: string;
  dish: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  submitter_name: string | null;
  submitter_contact: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

/** Where a place is, in one line, for a list row or a card. */
export function placeWhere(place: {
  neighborhood: string | null;
  city: string | null;
  country: string | null;
}): string {
  return [place.neighborhood, place.city, place.country]
    .filter(Boolean)
    .join(" · ");
}
