-- More than one photo per place.
--
-- One column held one picture, which forced a choice between the food and the
-- room. A place is usually both, and often several dishes.
--
-- An array rather than a photos table: there is one author, the photos have no
-- attributes of their own beyond their order, and a child table would buy
-- nothing but a join. Array order is display order; new photos append.
--
-- Safe to run once, on a database already carrying 0002.

alter table places
  add column if not exists photo_paths text[] not null default '{}';

-- Carry the existing photo across before the column goes.
update places
   set photo_paths = array[photo_path]
 where photo_path is not null
   and cardinality(photo_paths) = 0;

-- The verdict guard named the old column, so it has to be restated. Same rule:
-- nothing about a visit may exist on somewhere you have not been. `to_order`
-- stays outside it — knowing what to get somewhere you have not been is the
-- entire point of a to-do list.
alter table places drop constraint if exists places_verdict_needs_a_visit;
alter table places add constraint places_verdict_needs_a_visit
  check (been or (again is null and review is null
                  and cardinality(photo_paths) = 0 and visited_on is null));

alter table places drop column if exists photo_path;
