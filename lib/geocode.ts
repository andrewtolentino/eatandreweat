export type GeocodeHit = {
  lat: number;
  lng: number;
  /** The full one-line description Nominatim returns, for confirming a match. */
  label: string;
  /** Street address, assembled from the parts — "1468 Hyde Street". */
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  country: string | null;
};

type NominatimAddress = Partial<
  Record<
    | "house_number"
    | "road"
    | "neighbourhood"
    | "suburb"
    | "quarter"
    | "city"
    | "town"
    | "village"
    | "municipality"
    | "country",
    string
  >
>;

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
};

function toHit(result: NominatimResult): GeocodeHit {
  const parts = result.address ?? {};
  const street = [parts.house_number, parts.road].filter(Boolean).join(" ");

  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    label: result.display_name,
    address: street || null,
    // Nominatim spells the same idea three ways depending on the country.
    neighborhood: parts.neighbourhood ?? parts.suburb ?? parts.quarter ?? null,
    city: parts.city ?? parts.town ?? parts.village ?? parts.municipality ?? null,
    country: parts.country ?? null,
  };
}

/**
 * Name (and whatever else you know) → a located place, via OpenStreetMap's
 * Nominatim.
 *
 * Free, no key, no account. Called a handful of times a month — once when you
 * bookmark somewhere and once when you approve it — which is well inside
 * Nominatim's policy for occasional use. It is a convenience, not a source of
 * truth: every caller shows the match and lets you correct it before anything
 * is written, because a wrong pin is worse than no pin.
 *
 * Returns several candidates rather than one, because "Tartine" matches a
 * bakery in San Francisco and a café in Paris, and picking the first silently
 * would put your morning bun on the wrong continent. Pass `near` to bias the
 * search to where you are standing, which mostly settles that on its own.
 */
export async function geocode(
  query: string,
  { near, limit = 5 }: { near?: { lat: number; lng: number }; limit?: number } = {},
): Promise<GeocodeHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));

  if (near) {
    // Bounded to roughly 5km around you. Standing outside a place called
    // "Sunrise" and searching the whole planet is useless; searching the
    // neighbourhood you are standing in finds it first time.
    const d = 0.05;
    url.searchParams.set(
      "viewbox",
      [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(","),
    );
    url.searchParams.set("bounded", "1");
  }

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return [];

    const results = (await response.json()) as NominatimResult[];
    return results.map(toHit);
  } catch {
    // Offline, blocked, rate-limited — all the same to the caller, which falls
    // back to typing the address in by hand.
    return [];
  }
}
