/**
 * Turn a Google Maps saved list into seed SQL.
 *
 *   node scripts/import-saved-places.mjs <file> [--out supabase/seed/002_saved_places.sql]
 *
 * Accepts either export Google gives you:
 *
 *   • Takeout GeoJSON ("Saved Places.json", or a list exported as .json) —
 *     the good case. Google already knows where these are, so nothing needs
 *     geocoding and nothing can be geocoded wrong.
 *   • Takeout CSV (Title, Note, URL) — the common case for a single list.
 *     Coordinates are dug out of the URL where Google left them, and anything
 *     still missing is looked up by name through Nominatim.
 *   • A scraped list CSV (Title, Category, Status) — what you get from a shared
 *     list, which has no export. Category is Google's own, which is the best
 *     available answer to "is this food" and doubles as the filter chips.
 *
 * Two things are refused rather than imported: anything Google marks closed,
 * and anything whose category is not food. A category that is neither known
 * food nor known not-food is flagged for you rather than guessed at.
 *
 * Options:
 *   --out <path>        where to write the SQL
 *   --near <lat,lng>    anchor every lookup near here (a whole-list city)
 *   --city <name>       fill city on rows the lookup does not resolve
 *   --country <name>    same, for country
 *
 * Nothing is invented. A row that cannot be located is written into the output
 * as a commented-out line with the reason, exactly like the hand-built seed —
 * a pin in the wrong place is worse than no pin, and silently dropping a row is
 * worse than both.
 */

import { readFile, writeFile } from "node:fs/promises";
import { classify, isClosed } from "./google-categories.mjs";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
// Their usage policy is one request a second for occasional bulk work like
// this. Going faster gets the whole IP blocked, which is a bad trade for a
// script that runs once.
const RATE_LIMIT_MS = 1100;
const USER_AGENT = "eatandreweat-import/1.0 (personal saved-places import)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Minimal RFC4180 reader — Google quotes any field containing a comma. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];

  return rows
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => {
      // Overflow columns are folded back into the last one. Google quotes URLs
      // containing commas, as the format requires — but a Maps URL is full of
      // them ("@43.32,-1.98,17z"), and one unquoted line would otherwise split
      // into a truncated URL plus junk. A truncated URL loses the coordinates
      // silently, and the name lookup that replaces them is what puts a San
      // Sebastián bar in Montréal. URL is the last column in every Google
      // export, so re-joining the tail is the right repair.
      const cells = r.slice(0, header.length).map((v) => (v ?? "").trim());
      if (r.length > header.length) {
        cells[header.length - 1] = r
          .slice(header.length - 1)
          .join(",")
          .trim();
      }
      return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
    });
}

/**
 * Google leaves coordinates in its own URLs in two shapes. `!3d…!4d…` is the
 * place's own position; `@lat,lng,zoom` is only where the *camera* was, which
 * can be a block off — so it is used only as a fallback and flagged.
 */
function coordsFromUrl(url = "") {
  const exact = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (exact) return { lat: +exact[1], lng: +exact[2], exact: true };

  const camera = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (camera) return { lat: +camera[1], lng: +camera[2], exact: false };

  return null;
}

function fromGeoJson(json) {
  return (json.features ?? []).map((f) => {
    const props = f.properties ?? {};
    const loc = props.Location ?? {};
    const [lng, lat] = f.geometry?.coordinates ?? [];
    return {
      name: loc["Business Name"] || props.Title || "",
      address: loc.Address || null,
      note: props.Comment || null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      exact: true,
      url: props["Google Maps URL"] ?? null,
    };
  });
}

function fromCsv(rows) {
  return rows.map((r) => {
    const url = r.url || r["google maps url"] || "";
    const c = coordsFromUrl(url);
    return {
      name: r.title || r.name || "",
      address: r.address || null,
      note: r.note || r.comment || null,
      googleCategory: r.category || "",
      googleStatus: r.status || "",
      lat: c?.lat ?? null,
      lng: c?.lng ?? null,
      exact: c?.exact ?? false,
      url: url || null,
    };
  });
}

// ---------------------------------------------------------------------------
// Filling the gaps
// ---------------------------------------------------------------------------

/**
 * `near` is the camera position Google left in the URL. It is not the place,
 * but it is within a block or two of it — and passing it as a bounded viewbox
 * is the difference between finding the Bar Nestor in San Sebastián and finding
 * a different one in Montréal. An unbounded name search across the whole planet
 * is almost always wrong for a saved list.
 */
async function geocode(query, near = null) {
  const url = new URL(NOMINATIM);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");

  if (near) {
    const d = 0.05; // ~5km, generous enough for a camera position that drifted
    url.searchParams.set(
      "viewbox",
      [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(","),
    );
    url.searchParams.set("bounded", "1");
  }

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  if (!res.ok) return null;

  const [hit] = await res.json();
  if (!hit) return null;

  const a = hit.address ?? {};
  return {
    lat: +hit.lat,
    lng: +hit.lon,
    label: hit.display_name,
    address: [a.house_number, a.road].filter(Boolean).join(" ") || null,
    neighborhood: a.neighbourhood ?? a.suburb ?? a.quarter ?? null,
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? null,
    country: a.country ?? null,
  };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const q = (v) => (v == null || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function toSql(resolved, unresolved, source) {
  const rows = resolved.map(
    (p) =>
      `  (${q(p.slug)}, ${q(p.name)}, ${q(p.address)}, ${q(p.city)}, ` +
      `${q(p.neighborhood)}, ${q(p.country)}, ` +
      `'{${p.categories.join(",")}}', ${p.lat}, ${p.lng})`,
  );

  const notes = resolved
    .filter((p) => p.note)
    .map((p) => `--   ${p.name}: ${p.note.replace(/\s+/g, " ")}`);

  return `-- Imported from ${source} by scripts/import-saved-places.mjs.
--
-- Categories come from Google's own place type — see scripts/google-categories.mjs
-- for the mapping. Correct any that read oddly; they drive the filter chips.
--
-- No dishes: a saved place is somewhere you meant to go, not something you
-- ordered. Add the dish when you decide what to get.
--
-- Safe to re-run: conflicts on slug.
${notes.length ? `--\n-- Your notes from Google, which do not have a column here:\n${notes.join("\n")}\n` : ""}
insert into places (slug, name, address, city, neighborhood, country, categories, lat, lng) values
${rows.join(",\n")}
on conflict (slug) do nothing;
${
  unresolved.length
    ? `
-- ---------------------------------------------------------------------------
-- Not imported: ${unresolved.length} row${unresolved.length === 1 ? "" : "s"} that could not be located.
-- Add coordinates (right-click the spot in Google Maps) and uncomment.
-- ---------------------------------------------------------------------------
${unresolved.map((u) => `--   ${u.name || "(no name)"} — ${u.reason}`).join("\n")}
`
    : ""
}`;
}

// ---------------------------------------------------------------------------

const [file, ...rest] = process.argv.slice(2);
if (!file) {
  console.error(
    "usage: node scripts/import-saved-places.mjs <takeout.json|list.csv> [--out path.sql]",
  );
  process.exit(1);
}

const flag = (name, fallback = null) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : fallback;
};

const out = flag("out", "supabase/seed/002_saved_places.sql");
const nearArg = flag("near");
const defaultCity = flag("city");
const defaultCountry = flag("country");

// One anchor for the whole list. A shared list is almost always one city, and
// without this an unbounded search for a short name lands anywhere on earth.
const anchor = nearArg
  ? { lat: Number(nearArg.split(",")[0]), lng: Number(nearArg.split(",")[1]) }
  : null;

const raw = await readFile(file, "utf8");
const entries = file.endsWith(".json")
  ? fromGeoJson(JSON.parse(raw))
  : fromCsv(parseCsv(raw));

console.log(`read ${entries.length} saved place(s) from ${file}`);

const resolved = [];
const unresolved = [];
const seen = new Set();

for (const entry of entries) {
  if (!entry.name) {
    unresolved.push({ name: "", reason: "no name in the export" });
    continue;
  }

  // Closed first: a shut restaurant is not worth geocoding, and Google is the
  // only party here that actually knows.
  if (isClosed(entry.googleStatus)) {
    unresolved.push({ name: entry.name, reason: entry.googleStatus.toLowerCase() });
    continue;
  }

  // Then food. Scraped lists carry a category; a Takeout export does not, so
  // those fall through and are imported as before.
  let categories = [];
  if (entry.googleCategory || entry.googleStatus) {
    const verdict = classify(entry.googleCategory);
    if (!verdict.ok) {
      unresolved.push({ name: entry.name, reason: verdict.reason });
      continue;
    }
    categories = verdict.categories;
  }

  let { lat, lng, address } = entry;
  let neighborhood = null;
  let city = null;
  let country = null;

  // Anything without exact coordinates gets looked up, including the rows where
  // only a camera position was available — a lookup by name beats a viewport.
  if (lat == null || lng == null || !entry.exact) {
    const query = [entry.name, entry.address, defaultCity].filter(Boolean).join(", ");
    process.stdout.write(`  looking up ${entry.name}… `);

    const near = lat != null && lng != null ? { lat, lng } : anchor;

    let hit = null;
    try {
      hit = await geocode(query, near);
    } catch (e) {
      console.log(`failed (${e.message})`);
    }
    await sleep(RATE_LIMIT_MS);

    if (hit) {
      console.log(`→ ${hit.label}`);
      lat = hit.lat;
      lng = hit.lng;
      address = address || hit.address;
      neighborhood = hit.neighborhood;
      city = hit.city;
      country = hit.country;
    } else if (lat != null && lng != null) {
      // Nothing by that name nearby. The camera position is off by a block at
      // worst, which beats a confident match on the wrong continent.
      console.log("no match nearby — keeping the map-view coordinates from the URL");
    } else {
      console.log("no match");
      unresolved.push({
        name: entry.name,
        reason: "no coordinates in the export and no match in OpenStreetMap",
      });
      continue;
    }
  }

  let slug = slugify(entry.name);
  // Two branches of the same chain would otherwise collide on slug and the
  // second would be silently dropped by ON CONFLICT.
  while (seen.has(slug)) slug = `${slug}-2`;
  seen.add(slug);

  resolved.push({
    slug,
    name: entry.name,
    address,
    neighborhood,
    city: city || defaultCity,
    country: country || defaultCountry,
    categories,
    lat,
    lng,
    note: entry.note,
  });
}

await writeFile(out, toSql(resolved, unresolved, file));

console.log(
  `\nwrote ${out}\n  ${resolved.length} located, ${unresolved.length} left commented out`,
);
if (unresolved.length) {
  console.log("  unresolved:");
  for (const u of unresolved) console.log(`    ${u.name || "(no name)"} — ${u.reason}`);
}
