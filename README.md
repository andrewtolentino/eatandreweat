# Eat Andrew Eat!

Where I've eaten, what I ordered, and whether I'd go back — mapped. Anywhere in
the world, not just the Bay.

It replaces a spreadsheet with four columns — where to go, the thing to order
there, have I eaten it, would I go again — with a feed you can read and a map
you can actually use at 6pm when you're deciding where to walk.

## How it works

- **Two tabs.** *Recently* is the feed of write-ups, newest first. *Want to go*
  is everywhere with something left to try — including restaurants you have
  already written up, if one of their dishes is still outstanding, which is why
  it reads the dishes rather than the place's rolled-up state.
- **Category chips** narrow both tabs *and* the map at once, so the list and the
  pins are always the same set seen two ways. Categories live on the place as a
  `text[]`, because a café is honestly coffee and breakfast and often a bakery.
  Two chips lit means "both", not "either".
- **Hovering a card flies the map** to that place. The hover is settled with a
  short delay so scrolling a column doesn't fire a dozen camera moves, and it
  only ever zooms in — never back out — so running down the feed walks the map
  along instead of yo-yoing it. The map is a rail beside the feed and expands to
  full screen for browsing everywhere at once.
- **Places** are pins. **Dishes** hang off places, because the unit of the list
  is the dish, not the restaurant: KFC is on here twice, once for the pot pie
  and once for the Double Down.
- Each dish carries its own answer — eaten or not, would-go-again or not, a
  write-up, a photo, and the date. `again` is nullable on purpose: "been, still
  deciding" is a real answer, and rounding it down to a no would make the map
  lie.
- **A pin answers one question**: filled means been, hollow means not yet. The
  four-way verdict — would go again / undecided / wouldn't — is a judgement
  about a *dish*, and a map covered in ticks and crosses turns a list of places
  into a scorecard. It lives as a small tag at the foot of a card and in the
  panel, at the same weight as "Bakery" or "Coffee".

- Anyone can read the map and suggest a spot. Only **you** can add places, write
  dishes up, or approve suggestions. That boundary is enforced by row-level
  security in Postgres, not by the interface — the worst a tampered browser can
  do is show buttons whose writes then bounce.

There is deliberately no score. The sheet never had one, and "would you go
again" is a sharper question than a number out of ten.

Location is free text — `city` and `country` rather than an enum of Bay Area
regions. The enum stopped modelling anything the first time somewhere outside
California went on the list, and the place list groups by whichever city has the
most entries rather than by a hardcoded order.

## Stack

Next.js 16 static export · Supabase (Postgres + auth + RLS + storage) ·
MapLibre GL with [OpenFreeMap](https://openfreemap.org) Positron tiles ·
Tailwind 4. No server at runtime, no map API key, no billing account.

The interface is deliberately near-monochrome: off-white paper, hairline
borders, near-black ink, one sans throughout, links underlined rather than
coloured. The only colour on the page is the four verdict states — on the map
pins and on the badge that echoes each pin — plus whatever is in the photographs.
Error text is the single functional exception.

## Importing a Google Maps saved list

`scripts/import-saved-places.mjs` turns an export into seed SQL:

```bash
node scripts/import-saved-places.mjs "Saved Places.json"
node scripts/import-saved-places.mjs my-list.csv --out supabase/seed/002_saved.sql
```

Get the file from [Google Takeout](https://takeout.google.com) → *Maps (your
places)*. Two formats work:

- **GeoJSON** — the good case. Google already knows where everything is, so
  nothing is geocoded and nothing can be geocoded wrong.
- **CSV** (`Title, Note, URL`) — coordinates are dug out of the Maps URL, and
  anything still missing is looked up by name through Nominatim, *bounded to the
  area the URL points at*. That bound matters: an unbounded search for "Bar
  Nestor" confidently returns one in Montréal rather than the one in San
  Sebastián.

Nothing is invented. A row that cannot be located is written into the output as
a commented-out line with the reason, the same as the hand-built seed. Your
Google notes are preserved as SQL comments — there is no column for them, and a
note is not a write-up.

Categories and dishes are left empty: Google records neither, and guessing would
be wrong often enough to be useless. A place with no categories is invisible to
every filter chip, so set them from its panel.

## Setup

### 1. Supabase

Create a project, then in the SQL editor run, in order:

1. `supabase/migrations/0001_init.sql` — schema, policies, photo bucket.
2. `supabase/seed/001_the_list.sql` — the list, imported from the spreadsheet.
   Read its comments: six rows could not be geocoded and are left commented out
   with a note on what each is missing.

Then claim the map as its author:

```sql
insert into allowed_emails (email, note) values ('you@example.com', 'me');
```

Create the matching account by hand in **Authentication → Users** with *Auto
Confirm User* ticked. There is deliberately no self-signup — there is exactly
one person who should be able to write here, and `allowed_emails` is that list.
Anyone else who signs in lands read-only.

There is no profiles table and no display name to set: every answer on the site
is yours, so nothing is attributed.

### 2. Local

```bash
cp .env.local.example .env.local   # then paste your project URL and anon key
npm install
npm run dev
```

Both env values ship to the browser by design: the anon key is public and
guarded by RLS. Anything genuinely secret belongs in Supabase, never in this
build.

### 3. Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every
push to `main`. Set these as repo **variables** (not secrets):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_PATH` — `/<repo-name>` while on `github.io`.

### 4. The domain

`public/CNAME` already holds `eatandreweat.com`. At the registrar, point the
apex at GitHub Pages (verified against GitHub's docs, August 2026):

| Type | Name | Value |
|------|------|-------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `<your-username>.github.io` |

The AAAA records are optional; the four A records are the minimum. Then in the
repo's **Settings → Pages**, set the custom domain and wait for the TLS
certificate, and **delete the `NEXT_PUBLIC_BASE_PATH` variable** — with the
domain live the site serves from the root, and leaving the base path set would
prefix every asset with `/<repo-name>` and break them.

## Renaming it

The name lives in `lib/site.ts` and nowhere else — wordmark, tab title, meta
description and footer all read from it.
