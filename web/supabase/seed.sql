-- Idempotent demo catalog. Re-running replaces these slugs and their photos.
-- hidden-sample-draft stays unpublished so anonymous reads cannot see it.

begin;

insert into public.listings (
  id, slug, title, summary, description, category, space_type, neighborhood,
  city, state, price_cents, price_unit, capacity_label, available_from,
  available_until, featured, is_demo, status, sample_host_label, sort_order
) values
  (
    '11111111-1111-4111-8111-111111111001',
    'burns-park-driveway',
    'Two-car driveway on Olivia',
    'A driveway in front of a white house, a few blocks south of campus.',
    'Park one car, or two if you do not mind tandem. The sample host lives on the property and asks that you stay off the lawn and keep the sidewalk clear. This card is demo inventory, not a real offer.',
    'monthly-parking', 'Driveway', 'Burns Park', 'Ann Arbor', 'MI',
    14500, 'month', 'Two cars, one behind the other', '2026-08-25', '2027-04-30',
    true, true, 'published', 'Elena M.', 1
  ),
  (
    '11111111-1111-4111-8111-111111111002',
    'kerrytown-garage',
    'Lockable garage near Kerrytown',
    'A garage interior with shelves, tools, and stored gear along the walls.',
    'The sample photo shows a garage interior with shelves and equipment, not a climate-controlled room. The sample dates cover a summer lease gap. This card is demo inventory, not a real offer, and the photograph is not of a listed property.',
    'storage', 'Garage', 'Kerrytown', 'Ann Arbor', 'MI',
    11000, 'month', 'About one car’s worth of storage', '2026-05-01', '2026-08-20',
    true, true, 'published', 'Marcus L.', 2
  ),
  (
    '11111111-1111-4111-8111-111111111003',
    'stadium-lawn',
    'Game-day spot off State Street',
    'A front lawn and driveway apron for a home-game Saturday in this sample calendar.',
    'The sample host opens the lawn for football Saturdays inside the dates below. Arrive, park, and leave the same day. There is no overnight option on this listing. This card is demo inventory, not a real offer, and the dates are not an official schedule.',
    'event-parking', 'Lawn and apron', 'Burns Park', 'Ann Arbor', 'MI',
    5500, 'event', 'One car on the lawn or apron', '2026-09-05', '2026-11-21',
    true, true, 'published', 'Priya S.', 3
  ),
  (
    '11111111-1111-4111-8111-111111111004',
    'old-west-semester',
    'Semester parking on Seventh',
    'One reserved driveway space from late August through the fall term.',
    'The sample photo shows a paved driveway leading to a garage. The sample term runs from move-in week to the last week of exams. You would come and go as a resident, not as a game-day guest. This card is demo inventory, not a real offer, and the photograph is not of a listed property.',
    'monthly-parking', 'Driveway', 'Old West Side', 'Ann Arbor', 'MI',
    82000, 'semester', 'One car', '2026-08-24', '2026-12-18',
    true, true, 'published', 'Jonah K.', 4
  ),
  (
    '11111111-1111-4111-8111-111111111005',
    'water-hill-summer',
    'Summer storage in Water Hill',
    'A garage bay with shelves and stored gear, for the months between leases.',
    'The sample photo shows a garage interior with shelves and stored items. It is not a place to store a car for the summer, and it is not climate controlled. This card is demo inventory, not a real offer, and the photograph is not of a listed property.',
    'storage', 'Garage bay', 'Water Hill', 'Ann Arbor', 'MI',
    9500, 'month', 'Stored gear, not a vehicle', '2026-05-04', '2026-08-22',
    true, true, 'published', 'Helen C.', 5
  ),
  (
    '11111111-1111-4111-8111-111111111006',
    'packard-graduation',
    'Graduation weekend on Packard',
    'A driveway for the Friday through Sunday when families fill the neighborhood.',
    'The sample photo shows a car parked in a driveway beside a house. The sample window is a commencement weekend. The listing does not include a place to stay. This card is demo inventory, not a real offer, and the photograph is not of a listed property.',
    'university-event', 'Driveway', 'Burns Park', 'Ann Arbor', 'MI',
    7000, 'day', 'One car in the driveway', '2027-04-30', '2027-05-03',
    true, true, 'published', 'Andre P.', 6
  ),
  (
    '11111111-1111-4111-8111-111111111007',
    'south-main-carport',
    'Covered parking off South Main',
    'A covered space for someone who keeps a car through the sample season.',
    'The sample photo shows a car parked under a carport beside a house. The sample host wants a monthly parker, not a rotation of weekend guests. This card is demo inventory, not a real offer, and the photograph is not of a listed property.',
    'monthly-parking', 'Carport', 'South Main', 'Ann Arbor', 'MI',
    16000, 'month', 'One car, covered', '2026-09-01', '2027-05-10',
    false, true, 'published', 'Ruth A.', 7
  ),
  (
    '11111111-1111-4111-8111-111111111008',
    'eberwhite-saturday',
    'Saturday parking in Eberwhite',
    'A quieter driveway west of campus for the Saturdays in this sample window.',
    'The sample photo shows a house with a concrete driveway and a small lawn. Farther from the stadium than the Burns Park listing, and priced that way. One car, in and out the same day. This card is demo inventory, not a real offer, and the photograph is not of a listed property.',
    'event-parking', 'Driveway', 'Eberwhite', 'Ann Arbor', 'MI',
    4000, 'event', 'One car', '2026-09-12', '2026-10-31',
    false, true, 'published', 'Chris F.', 8
  ),
  (
    '11111111-1111-4111-8111-111111111099',
    'hidden-sample-draft',
    'Unpublished sample',
    'This row exists to prove anonymous clients cannot read drafts.',
    'Not a public listing.',
    'storage', 'Garage', 'Kerrytown', 'Ann Arbor', 'MI',
    100, 'month', 'None', '2026-01-01', '2026-01-02',
    false, true, 'draft', 'Draft H.', 99
  )
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  category = excluded.category,
  space_type = excluded.space_type,
  neighborhood = excluded.neighborhood,
  city = excluded.city,
  state = excluded.state,
  price_cents = excluded.price_cents,
  price_unit = excluded.price_unit,
  capacity_label = excluded.capacity_label,
  available_from = excluded.available_from,
  available_until = excluded.available_until,
  featured = excluded.featured,
  is_demo = excluded.is_demo,
  status = excluded.status,
  sample_host_label = excluded.sample_host_label,
  sort_order = excluded.sort_order,
  updated_at = now();

delete from public.listing_photos
where listing_id in (
  select id from public.listings
  where slug in (
    'burns-park-driveway', 'kerrytown-garage', 'stadium-lawn', 'old-west-semester',
    'water-hill-summer', 'packard-graduation', 'south-main-carport', 'eberwhite-saturday',
    'hidden-sample-draft'
  )
);

insert into public.listing_photos (listing_id, path, alt, sort_order, is_primary)
select id, path, alt, 0, true
from (
  values
    ('burns-park-driveway', '/images/driveway-modern.jpg', 'A white house with a driveway and a garage door'),
    ('kerrytown-garage', '/images/garage-workshop.jpg', 'A garage interior with shelves, tools, and stored gear'),
    ('stadium-lawn', '/images/front-lawn.jpg', 'A house with a green front lawn, a driveway, and a garage'),
    ('old-west-semester', '/images/brick-house.jpg', 'A paved driveway leading to a garage in front of a house'),
    ('water-hill-summer', '/images/storage-boxes.jpg', 'A garage interior with shelves, tools, and stored items'),
    ('packard-graduation', '/images/front-porch.jpg', 'A white car parked in a concrete driveway beside a house'),
    ('south-main-carport', '/images/evening-driveway.jpg', 'A car parked under a carport beside a house'),
    ('eberwhite-saturday', '/images/brick-street.jpg', 'A suburban house with a concrete driveway and a small front lawn'),
    ('hidden-sample-draft', '/images/garage-workshop.jpg', 'Unpublished sample photo')
) as photo(slug, path, alt)
join public.listings on listings.slug = photo.slug;

commit;
