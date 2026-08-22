-- The list, imported from the spreadsheet this site replaces.
--
-- Every coordinate here came from OpenStreetMap (Nominatim), matched on the
-- business name — except where a comment says otherwise. Nothing is a guess
-- dressed up as a fact: the six rows that could not be resolved are at the
-- bottom, commented out, with what is missing spelled out for each.
--
-- Two things the sheet taught the schema, visible here:
--
--   * KFC appears once as a place and twice as a dish. That is the pot pie and
--     the Double Down, which are answered separately.
--   * Some rows are a place with nothing decided yet. Those are seeded with no
--     dish at all, which the site handles — a pin with an empty "what to order"
--     is a real state, not a broken row.
--
-- Safe to re-run: places conflict on slug, dishes on (place_id, name).

-- ---------------------------------------------------------------------------
-- Places
-- ---------------------------------------------------------------------------

insert into places (slug, name, address, city, neighborhood, country, categories, lat, lng) values
  -- San Francisco
  ('toyose',          'Toyose',              '3814 Noriega Street', 'San Francisco', 'Outer Sunset',  'United States', '{dinner,late_night,bar}', 37.7531436, -122.5046807),
  -- Chubby Noodle has two SF locations in OSM; this is the Grant Avenue one.
  -- Move the pin to 570 Green Street if the Marina one is the one you meant.
  ('chubby-noodle',   'Chubby Noodle',       '1310 Grant Avenue',   'San Francisco', 'North Beach',   'United States', '{lunch,dinner}', 37.7990483, -122.4071819),
  ('hot-sauce-panko', 'Hot Sauce and Panko', '1468 Hyde Street',    'San Francisco', 'Russian Hill',  'United States', '{lunch,dinner}', 37.7945086, -122.4179820),
  ('yummy-yummy',     'Yummy Yummy',         '1015 Irving Street',  'San Francisco', 'Inner Sunset',  'United States', '{lunch,dinner}', 37.7638036, -122.4688082),
  ('kezar-pub',       'Kezar Pub',           '770 Stanyan Street',  'San Francisco', 'Cole Valley',   'United States', '{lunch,dinner,bar}', 37.7678824, -122.4529648),
  ('hi-tops',         'Hi Tops',             '2247 Market Street',  'San Francisco', 'Castro',        'United States', '{dinner,late_night,bar}', 37.7649986, -122.4318228),
  ('memphis-minnies', 'Memphis Minnie''s',   '576 Haight Street',   'San Francisco', 'Lower Haight',  'United States', '{lunch,dinner}', 37.7720644, -122.4316640),
  ('yamadaya',        'Ramen Yamadaya',      '1728 Buchanan Street','San Francisco', 'Japantown',     'United States', '{lunch,dinner}', 37.7860424, -122.4297690),
  ('waraku',          'Waraku',              '1638 Post Street',    'San Francisco', 'Japantown',     'United States', '{lunch,dinner}', 37.7858321, -122.4287697),

  -- The chains. The sheet just says "Taco Bell" and "KFC", so the branch is a
  -- choice this seed had to make: both resolve to 691 Eddy Street, which is a
  -- combined store, so the two pins sit on top of each other by design. Drag
  -- them to whichever branch you actually meant.
  ('taco-bell',       'Taco Bell',           '691 Eddy Street',     'San Francisco', 'Tenderloin',    'United States', '{late_night}', 37.7830061, -122.4190289),
  ('kfc',             'KFC',                 '691 Eddy Street',     'San Francisco', 'Tenderloin',    'United States', '{lunch,dinner}', 37.7829665, -122.4190187),
  -- Likewise Popeyes: three SF branches in OSM, this is the Divisadero one.
  ('popeyes',         'Popeyes',             '599 Divisadero Street','San Francisco','Alamo Square',  'United States', '{lunch,dinner}', 37.7748604, -122.4379581),

  -- East Bay
  -- Double Decker is not in OSM by name; this is its street address resolved to
  -- the building. Worth a glance on the map before you trust it.
  ('double-decker',   'Double Decker',       '465 Grand Avenue',    'Oakland',       'Adams Point',   'United States', '{dinner,bar}', 37.8086917, -122.2532045),
  -- The nearest Fuddruckers in OSM is Concord — a long way from the rest of the
  -- list, but it is where one is.
  ('fuddruckers',     'Fuddruckers',         'Willows Shopping Center', 'Concord',   null,            'United States', '{lunch,dinner}', 37.9700325, -122.0562633)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Dishes — column B, with columns C and D alongside
--
-- `again` is null wherever the sheet said you had been but never said whether
-- you would go back. That is "undecided", and it shows on the map as its own
-- state rather than being rounded down to a no.
--
-- No dates: the sheet never recorded when. Fill them in as you write each one
-- up, or leave them off — the field is optional.
-- ---------------------------------------------------------------------------

insert into dishes (place_id, name, eaten, again)
select p.id, d.name, d.eaten, d.again
from (values
  ('toyose',          'Wings',                      true,  true),
  ('fuddruckers',     'Cheese sauce ON EVERYTHING', true,  true),
  ('chubby-noodle',   'Ramen',                      true,  null),
  ('yummy-yummy',     'Everything',                 true,  null),
  ('hot-sauce-panko', 'Wings',                      false, null),
  ('kezar-pub',       'Wings',                      false, null),
  ('hi-tops',         'Wings — 25¢ Mondays',        false, null),
  ('memphis-minnies', 'Wings',                      false, null),
  ('yamadaya',        'Ramen',                      false, null),
  ('waraku',          'Ramen',                      false, null),
  ('taco-bell',       'Doritos Locos',              false, null),
  -- The reason dishes are their own table.
  ('kfc',             'Pot Pie',                    false, null),
  ('kfc',             'Double Down',                false, null),
  ('double-decker',   'Wings',                      false, null)
) as d(slug, name, eaten, again)
join places p on p.slug = d.slug
on conflict (place_id, name) do nothing;

-- Popeyes is deliberately dishless. The sheet has it marked been-and-would-go-
-- again, but never says what you ordered — and the verdict lives on the dish,
-- so there is nothing to hang it on. Add the dish from its panel, tick it
-- there, and the pin turns gold.

-- ---------------------------------------------------------------------------
-- Not imported — six rows that need a decision from you
--
-- Each of these is missing the one thing a pin cannot be faked without: a
-- location. Fill in the coordinates (right-click the spot in Google Maps →
-- the numbers at the top of the menu) and uncomment.
--
--   Hot Pot Garden      no match in OpenStreetMap anywhere in the Bay Area.
--   Korean BBQ          not a business name — which one did you mean?
--   Little Sheep Hotpot the sheet says San Mateo; no San Mateo branch is in
--                       OSM. Marked as eaten in the sheet, so worth pinning —
--                       the dish below is seeded eaten to match.
--   Lightning Tavern    no match. Believed to have closed, but not confirmed
--                       here — check before you spend a Wednesday on 25¢ wings.
--   Ssisso              no match under this spelling.
--   Farmer Brown's      the building at 25 Mason Street resolves, but the
--                       business is not in OSM, which usually means it has
--                       closed. Coordinates below are the address, not a
--                       confirmed restaurant.
-- ---------------------------------------------------------------------------

-- insert into places (slug, name, address, city, neighborhood, country, categories, lat, lng) values
--   ('hot-pot-garden',  'Hot Pot Garden',       null,              'San Francisco', null,           'United States', 0, 0),
--   ('korean-bbq',      'Korean BBQ',           null,              null,            null,           'United States', 0, 0),
--   ('little-sheep',    'Little Sheep Hotpot',  null,              'San Mateo',     null,           'United States', 0, 0),
--   ('lightning-tavern','Lightning Tavern',     null,              'San Francisco', null,           'United States', 0, 0),
--   ('ssisso',          'Ssisso',               null,              null,            null,           'United States', 0, 0),
--   ('farmer-browns',   'Farmer Brown''s',      '25 Mason Street', 'San Francisco', 'Union Square', 'United States', 37.7834959, -122.4092431)
-- on conflict (slug) do nothing;
--
-- insert into dishes (place_id, name, eaten, again)
-- select p.id, d.name, d.eaten, d.again
-- from (values
--   ('little-sheep',     'Hot pot',                 true,  null),
--   ('lightning-tavern', 'Wings — 25¢ Wednesdays',  false, null),
--   ('ssisso',           'Japanese style wings',    false, null),
--   ('farmer-browns',    'All-you-can-eat brunch',  false, null)
-- ) as d(slug, name, eaten, again)
-- join places p on p.slug = d.slug
-- on conflict (place_id, name) do nothing;
