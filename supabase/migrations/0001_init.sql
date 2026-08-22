-- Eat Andrew Eat! — initial schema
-- Paste into the Supabase SQL editor and run once against a fresh project.
--
-- The model comes from the spreadsheet this replaces, which had four columns:
-- where to go, what to order there, have I eaten it, would I go again. Two
-- things about that sheet drive the whole schema:
--
--   * KFC appeared twice — once for the pot pie, once for the Double Down. The
--     unit of the list is the *dish*, not the restaurant. So places carry pins
--     and dishes carry answers.
--   * One person fills it in. That is why there is no profiles table, no
--     per-user rollup and no attribution anywhere: every answer on the site is
--     the same person's, so recording whose it is would be noise. Everything a
--     dish knows lives on the dish row.
--
-- There is deliberately no score. The sheet never had one, and "would you go
-- again" is a sharper question than a number out of ten.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- 'dropped' is deliberately distinct from 'closed': a place can be open and
-- thriving and still not belong on the map, because the dish came off the menu
-- or was never there. Keeping both as statuses rather than deleting the row
-- means the place is remembered as considered-and-rejected, so it does not get
-- re-suggested and re-added six months later — and any write-up left while the
-- dish still existed survives as a record of a real meal.
create type place_status as enum ('open','closed','dropped');

-- A report points at a place already on the map; a suggestion proposes one that
-- does not exist yet. Both land in the same inbox, and the
-- write-only-to-the-public boundary is the same for each.
create type suggestion_kind as enum ('new_place','gone');

-- ---------------------------------------------------------------------------
-- Who is allowed to write
--
-- A list of one, kept by hand in the SQL editor and never written from the app.
-- No RLS policies are defined on this table, which with RLS enabled means
-- *nobody* can read or write it through the API — only the service role and
-- this editor.
--
-- A table rather than a hardcoded address so a second address (a phone-only
-- account, a replacement email) is an insert rather than a migration.
-- ---------------------------------------------------------------------------

create table allowed_emails (
  email      text primary key,
  note       text,
  created_at timestamptz default now()
);
alter table allowed_emails enable row level security;

-- Reads the signed-in user's email straight out of their JWT. With one author
-- there is nothing else to know about them, so this replaces the usual
-- profiles table and new-user trigger entirely.
--
-- security definer because allowed_emails is readable by nobody through the
-- API; the function owner can see it, the caller cannot. Returns false rather
-- than erroring when nobody is signed in, since auth.jwt() is null for anon.
create or replace function is_author()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------------
-- Places — column A of the sheet, plus what it takes to put a pin down
-- ---------------------------------------------------------------------------

create table places (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  address      text,
  city         text,
  -- How you actually refer to these places ("Kezar, Cole Valley"). `city`
  -- cannot carry it: every SF spot has the same city.
  neighborhood text,
  -- Free text rather than an enum. This started as five Bay Area regions, which
  -- stopped modelling anything the first time somewhere outside California went
  -- on the list. A column that can hold "Japan" without a migration is worth
  -- more than one the database can validate.
  country      text,
  -- What kind of meal this is for: breakfast, coffee, bakery, dinner… An array
  -- because the honest answer is usually more than one, and text[] rather than
  -- an enum[] because this is exactly the kind of list that grows — adding
  -- "wine bar" should not be a migration. See lib/categories.ts for the set the
  -- interface offers.
  categories   text[] not null default '{}',
  lat          double precision not null,
  lng          double precision not null,
  website      text,
  status       place_status not null default 'open',
  created_at   timestamptz default now()
);
alter table places enable row level security;

-- ---------------------------------------------------------------------------
-- Dishes — column B, and everything you have to say about it
--
-- The list is a list of dishes. One restaurant can hold several, and each is
-- answered separately: the pot pie is not the Double Down.
--
-- `again` is deliberately nullable, because "I ate it and I have not made up my
-- mind" is a real and common answer. Forcing it to false would quietly turn
-- every undecided dish into a rejection, and the map would lie.
-- ---------------------------------------------------------------------------

create table dishes (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid not null references places(id) on delete cascade,
  name       text not null,
  eaten      boolean not null default false,
  again      boolean,
  -- The blog half. Both optional: a place you have not been to has nothing to
  -- say yet, and not every meal is worth photographing.
  note       text,
  photo_path text,
  eaten_on   date,
  created_at timestamptz default now(),
  -- The same dish listed twice at one place is a duplicate, not two entries.
  unique (place_id, name),
  -- A verdict or a write-up on something you have not eaten is a data entry
  -- slip, not an opinion. The database is the right place to catch it, because
  -- the form is just JavaScript that anyone can bypass.
  constraint dishes_verdict_needs_a_meal
    check (eaten or (again is null and note is null
                     and photo_path is null and eaten_on is null))
);
create index dishes_place_id_idx on dishes (place_id);
alter table dishes enable row level security;

-- ---------------------------------------------------------------------------
-- Suggestions — the one thing other people can write
-- ---------------------------------------------------------------------------

create table suggestions (
  id                uuid primary key default gen_random_uuid(),
  kind              suggestion_kind not null default 'new_place',
  place_id          uuid references places(id) on delete cascade,
  name              text not null,
  -- What to order there. A place with no dish attached is half a suggestion, so
  -- the form asks — but it can be filled in on approval rather than rejecting
  -- the tip outright.
  dish              text,
  address           text,
  city              text,
  country           text,
  -- Filled in when the suggest form looks the place up, so approving it does
  -- not have to geocode the same query again. Nullable: a tip typed in from
  -- memory has no coordinates, and that is still a useful tip.
  lat               double precision,
  lng               double precision,
  submitter_name    text,
  submitter_contact text,
  note              text,
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  created_at        timestamptz default now()
);
alter table suggestions enable row level security;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- The map is world-readable and author-writable. That is the whole access model.
create policy "places are public" on places
  for select using (true);
create policy "author manages places" on places
  for all to authenticated using (is_author()) with check (is_author());

create policy "dishes are public" on dishes
  for select using (true);
create policy "author manages dishes" on dishes
  for all to authenticated using (is_author()) with check (is_author());

-- The public may drop a note in the box but can never read the box. Length caps
-- are enforced here rather than in the form, since the form is just JavaScript
-- that anyone can bypass.
create policy "anyone can suggest" on suggestions
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and length(name) between 1 and 120
    and coalesce(length(dish), 0)              <= 120
    and coalesce(length(address), 0)           <= 200
    and coalesce(length(city), 0)              <= 80
    and coalesce(length(country), 0)           <= 80
    and coalesce(length(submitter_name), 0)    <= 80
    and coalesce(length(submitter_contact), 0) <= 120
    and coalesce(length(note), 0)              <= 1000
    -- A report is meaningless without the place it is about.
    and (kind <> 'gone' or place_id is not null)
  );
create policy "author reads suggestions" on suggestions
  for select to authenticated using (is_author());
create policy "author updates suggestions" on suggestions
  for update to authenticated using (is_author()) with check (is_author());

-- ---------------------------------------------------------------------------
-- Photo storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('dish-photos', 'dish-photos', true)
on conflict (id) do nothing;

create policy "dish photos are public" on storage.objects
  for select using (bucket_id = 'dish-photos');
create policy "author uploads dish photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dish-photos' and is_author());
create policy "author replaces dish photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'dish-photos' and is_author());
create policy "author deletes dish photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dish-photos' and is_author());
