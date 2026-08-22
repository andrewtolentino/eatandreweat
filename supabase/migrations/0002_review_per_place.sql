-- The review belongs to the place, not to a dish.
--
-- The dish was the unit because the spreadsheet had KFC on it twice, once for
-- the pot pie and once for the Double Down. That is a real distinction, but it
-- turned out to be the wrong *spine*: writing a review meant first inventing a
-- dish to hang it on, the feed showed one card per order rather than per
-- restaurant, and a place with two write-ups produced two cards with identical
-- headings.
--
-- So: one review per place, and "what to get" becomes a plain text field
-- alongside it — which is all the pot pie and the Double Down ever needed to be.
--
-- Safe to run once, on a database already carrying 0001. Existing dishes are
-- folded up into their place before the table goes.

-- ---------------------------------------------------------------------------
-- New shape
-- ---------------------------------------------------------------------------

alter table places
  add column if not exists been       boolean not null default false,
  add column if not exists again      boolean,
  add column if not exists review     text,
  -- Free text, deliberately. "Wings" and "the pot pie, and the Double Down for
  -- the bit" are both valid answers, and only one of them fits a table.
  add column if not exists to_order   text,
  add column if not exists photo_path text,
  add column if not exists visited_on date;

-- ---------------------------------------------------------------------------
-- Carry the dishes across
--
-- Nothing is dropped on the floor: notes are concatenated, dish names become
-- the "what to get" line, the newest visit date wins, and the verdict rolls up
-- the way the interface already rolled it up — one dish worth returning for
-- makes the place worth returning to.
-- ---------------------------------------------------------------------------

update places p set
  been       = s.been,
  again      = s.again,
  review     = s.review,
  to_order   = s.to_order,
  photo_path = s.photo_path,
  visited_on = s.visited_on
from (
  select
    place_id,
    bool_or(eaten) as been,
    case
      when bool_or(again is true)  then true
      when bool_or(again is false) then false
      else null
    end as again,
    string_agg(note, E'\n\n' order by name) filter (where note is not null)
      as review,
    string_agg(name, ', ' order by name) as to_order,
    (array_agg(photo_path order by (photo_path is null), name))[1] as photo_path,
    max(eaten_on) as visited_on
  from dishes
  group by place_id
) s
where p.id = s.place_id;

-- A verdict or a write-up on somewhere you have not been is a data entry slip,
-- not an opinion. `to_order` is deliberately outside this: knowing what to get
-- somewhere you have not been yet is the entire point of a to-do list.
alter table places drop constraint if exists places_verdict_needs_a_visit;
alter table places add constraint places_verdict_needs_a_visit
  check (been or (again is null and review is null
                  and photo_path is null and visited_on is null));

drop table if exists dishes;

-- ---------------------------------------------------------------------------
-- Storage
--
-- The bucket was named for dishes. Renaming is free right now because it is
-- empty; the delete below fails loudly rather than silently orphaning anything
-- if that stops being true.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;

drop policy if exists "place photos are public" on storage.objects;
create policy "place photos are public" on storage.objects
  for select using (bucket_id = 'place-photos');

drop policy if exists "author uploads place photos" on storage.objects;
create policy "author uploads place photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'place-photos' and is_author());

drop policy if exists "author replaces place photos" on storage.objects;
create policy "author replaces place photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'place-photos' and is_author());

drop policy if exists "author deletes place photos" on storage.objects;
create policy "author deletes place photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'place-photos' and is_author());

drop policy if exists "dish photos are public" on storage.objects;
drop policy if exists "author uploads dish photos" on storage.objects;
drop policy if exists "author replaces dish photos" on storage.objects;
drop policy if exists "author deletes dish photos" on storage.objects;

delete from storage.buckets where id = 'dish-photos';
