-- Local ownership and market checks. Run as superuser after auth-shim.sql,
-- the profile migration, and 20261016050000_host_markets.sql.
-- The whole script rolls back. Do not run it on the hosted project.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'host-a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'host-b@example.test');

do $$
begin
  if (select count(*) from public.colleges) <> 1 then
    raise exception 'hosted seed should contain only one college';
  end if;
  if (
    select slug from public.colleges
  ) <> 'university-of-michigan-ann-arbor' then
    raise exception 'the seeded college is not University of Michigan–Ann Arbor';
  end if;
  if (select count(*) from public.listings) <> 9 then
    raise exception 'existing listings were not preserved';
  end if;
  if (select count(*) from public.listings where is_demo and status = 'published') <> 8 then
    raise exception 'demo catalog is no longer eight published listings';
  end if;
  if (select count(*) from public.listings where slug = 'hidden-sample-draft' and status = 'draft') <> 1 then
    raise exception 'hidden draft was not preserved';
  end if;
  if (select count(*) from public.listing_photos) <> 9 then
    raise exception 'existing images were not preserved';
  end if;
  if exists (select 1 from public.listing_photos where path not like '/images/%') then
    raise exception 'existing photo paths changed';
  end if;
  if (
    select count(*) from public.listing_colleges
    where college_id = 'a0000000-0000-4000-8000-000000000001' and is_primary
  ) <> 9 then
    raise exception 'existing listings were not linked to Ann Arbor';
  end if;
end $$;

insert into public.colleges (id, slug, name, state_code, city, market_status) values
  (
    'a0000000-0000-4000-8000-000000000002',
    'planned-fixture-college',
    'Planned fixture college',
    'WI',
    'Madison',
    'planned'
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'planned-fixture-college-ann-arbor',
    'Planned fixture college',
    'MI',
    'Ann Arbor',
    'planned'
  );

do $$
begin
  if (select count(*) from public.colleges where name = 'Planned fixture college') <> 2 then
    raise exception 'college names were treated as unique';
  end if;
  if (
    select count(*) from public.colleges
    where city = 'Ann Arbor' and state_code = 'MI'
  ) < 2 then
    raise exception 'two colleges should be able to share a city';
  end if;
  if (
    select market_status from public.colleges
    where slug = 'university-of-michigan-ann-arbor'
  ) <> 'active' then
    raise exception 'Ann Arbor is not the active market';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

insert into public.listings (
  owner_id, slug, title, summary, description, category, space_type, neighborhood, city, state,
  price_cents, price_unit, capacity_label, available_from, available_until, dates_confirmed,
  featured, is_demo, status, sample_host_label, sort_order
) values (
  '11111111-1111-4111-8111-111111111111',
  'host-a-driveway',
  'Driveway',
  'A paved driveway near campus.',
  'The driveway is paved and empty on weekdays during the term.',
  'monthly-parking',
  'Driveway',
  'Burns Park',
  'Ann Arbor',
  'MI',
  10000,
  'month',
  'Two cars',
  '2026-09-01',
  '2026-12-15',
  true,
  false,
  false,
  'draft',
  'Host',
  500
);

do $$
begin
  begin
    insert into public.listings (
      owner_id, slug, title, summary, description, category, space_type, neighborhood, city, state,
      price_cents, price_unit, capacity_label, available_from, available_until,
      featured, is_demo, status, sample_host_label, sort_order
    ) values (
      '22222222-2222-4222-8222-222222222222',
      'stolen-owner',
      'Stolen',
      'x',
      'x',
      'storage',
      'Garage',
      'Burns Park',
      'Ann Arbor',
      'MI',
      100,
      'month',
      'One',
      '2026-09-01',
      '2026-12-15',
      false,
      false,
      'draft',
      'Host',
      500
    );
    raise exception 'host A inserted a listing owned by host B';
  exception
    when insufficient_privilege or check_violation then null;
  end;
  begin
    insert into public.listings (
      owner_id, slug, title, summary, description, category, space_type, neighborhood, city, state,
      price_cents, price_unit, capacity_label, available_from, available_until,
      featured, is_demo, status, sample_host_label, sort_order
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'published-on-insert',
      'Published',
      'A paved driveway near campus.',
      'The driveway is paved and empty on weekdays during the term.',
      'monthly-parking',
      'Driveway',
      'Burns Park',
      'Ann Arbor',
      'MI',
      10000,
      'month',
      'Two cars',
      '2026-09-01',
      '2026-12-15',
      false,
      false,
      'published',
      'Host',
      500
    );
    raise exception 'host inserted a listing already published';
  exception
    when insufficient_privilege or check_violation then null;
  end;
end $$;

insert into public.listing_private (listing_id, address_line, access_notes)
select id, '100 Packard St', 'Gate code 9999'
from public.listings
where slug = 'host-a-driveway';

insert into public.listing_photos (listing_id, path, alt, sort_order, is_primary)
select id, id::text || '/photo.jpg', 'Driveway', 0, true
from public.listings
where slug = 'host-a-driveway';

insert into public.listing_blocked_dates (listing_id, starts_on, ends_on)
select id, '2026-10-01', '2026-10-02'
from public.listings
where slug = 'host-a-driveway';

do $$
begin
  begin
    perform owner_id from public.listings where slug = 'host-a-driveway';
    raise exception 'authenticated client can read owner_id';
  exception
    when insufficient_privilege then null;
  end;
  if (
    select count(*)
    from public.host_listing_ids() as owned
    join public.listings as listing on listing.id = owned.listing_id
    where listing.slug = 'host-a-driveway'
  ) <> 1 then
    raise exception 'owner cannot list their own draft';
  end if;
  if (select count(*) from public.listings where slug = 'hidden-sample-draft') <> 0 then
    raise exception 'host can see the hidden demo draft';
  end if;
end $$;

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.listings where slug = 'host-a-driveway') <> 0 then
    raise exception 'host B can read host A draft';
  end if;
  if (select count(*) from public.host_listing_ids()) <> 0 then
    raise exception 'host B received another host listing id';
  end if;
  if (select count(*) from public.listing_private) <> 0 then
    raise exception 'host B can read a private address';
  end if;
  update public.listings set title = 'taken' where slug = 'host-a-driveway';
  if found then
    raise exception 'host B updated host A listing';
  end if;
end $$;

reset role;
set role anon;
do $$
begin
  if (select count(*) from public.listings where slug = 'host-a-driveway') <> 0 then
    raise exception 'anonymous reader can see a draft';
  end if;
  if (select count(*) from public.listing_photos where alt = 'Driveway') <> 0 then
    raise exception 'anonymous reader can see a draft photo';
  end if;
  begin
    perform count(*) from public.listing_private;
    raise exception 'anonymous reader can query private addresses';
  exception
    when insufficient_privilege then null;
  end;
  if (select count(*) from public.listings where is_demo and status = 'published') <> 8 then
    raise exception 'demo catalog is no longer eight published listings';
  end if;
  begin
    perform owner_id from public.listings;
    raise exception 'anonymous client can read owner_id';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

do $$
begin
  update public.listings set status = 'published' where slug = 'host-a-driveway';
  raise exception 'published without an active market';
exception
  when check_violation then null;
end $$;

reset role;
set role anon;
do $$
begin
  if (select count(*) from public.listings where slug = 'host-a-driveway') <> 0 then
    raise exception 'a draft without an active market is public';
  end if;
end $$;

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

insert into public.listing_colleges (listing_id, college_id, is_primary)
select id, 'a0000000-0000-4000-8000-000000000002', true
from public.listings
where slug = 'host-a-driveway';

do $$
begin
  update public.listings set status = 'published' where slug = 'host-a-driveway';
  raise exception 'planned market was publishable';
exception
  when check_violation then null;
end $$;

reset role;
set role anon;
do $$
begin
  if (select count(*) from public.listings where slug = 'host-a-driveway') <> 0 then
    raise exception 'a planned market made a listing public';
  end if;
end $$;

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

delete from public.listing_colleges
where listing_id = (select id from public.listings where slug = 'host-a-driveway');

insert into public.listing_colleges (listing_id, college_id, is_primary)
select id, 'a0000000-0000-4000-8000-000000000001', true
from public.listings
where slug = 'host-a-driveway';

do $$
begin
  if to_regprocedure('public.listings_require_stored_photo()') is not null then
    insert into storage.objects (bucket_id, name)
    select 'listing-photos', id::text || '/photo.jpg'
    from public.listings
    where slug = 'host-a-driveway';
  end if;
end $$;

update public.listings set status = 'published' where slug = 'host-a-driveway';

do $$
begin
  insert into public.listing_photos (listing_id, path, alt, sort_order, is_primary)
  select id, '11111111-1111-4111-8111-111111111111/stolen.jpg', 'Stolen', 1, false
  from public.listings
  where slug = 'host-a-driveway';
  raise exception 'photo path was not tied to the listing';
exception
  when check_violation then null;
end $$;

do $$
begin
  insert into public.listing_photos (listing_id, path, alt, sort_order, is_primary)
  select id, '/images/driveway-modern.jpg', 'Demo asset', 1, false
  from public.listings
  where slug = 'host-a-driveway';
  raise exception 'host photo used a static image path';
exception
  when check_violation then null;
end $$;

do $$
begin
  update public.listings
  set owner_id = '22222222-2222-4222-8222-222222222222'
  where slug = 'host-a-driveway';
exception
  when insufficient_privilege then null;
end $$;

reset role;
set role anon;
do $$
begin
  if (select count(*) from public.listings where slug = 'host-a-driveway') <> 1 then
    raise exception 'active market did not publish the listing';
  end if;
  if (select count(*) from public.listing_photos where alt = 'Driveway') <> 1 then
    raise exception 'published photo is hidden';
  end if;
  begin
    perform address_line from public.listing_private;
    raise exception 'anonymous reader can read an address';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;
do $$
begin
  if (
    select owner_id::text from public.listings where slug = 'host-a-driveway'
  ) <> '11111111-1111-4111-8111-111111111111' then
    raise exception 'owner id was reassigned';
  end if;
end $$;

rollback;
