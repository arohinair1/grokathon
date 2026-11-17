-- Local checks for published-listing edits and blocked-date search.
-- Rolls back. Do not run on the hosted project.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'host-integrity@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'host-other@example.test');

insert into public.listings (
  id, owner_id, slug, title, summary, description, category, space_type, neighborhood, city, state,
  price_cents, price_unit, capacity_label, available_from, available_until, dates_confirmed,
  featured, is_demo, status, sample_host_label, sort_order
) values (
  'b2000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'integrity-driveway',
  'Integrity driveway',
  'A paved driveway near campus.',
  'The driveway is paved and empty on weekdays during the term.',
  'monthly-parking', 'Driveway', 'Burns Park', 'Ann Arbor', 'MI',
  4000, 'day', 'One car', '2027-01-01', '2027-12-31',
  true, false, false, 'draft', 'Host', 500
);

insert into public.listing_photos (listing_id, path, alt, sort_order, is_primary) values
  ('b2000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001/cover.jpg', 'Driveway', 0, true);
insert into public.listing_private (listing_id, address_line) values
  ('b2000000-0000-4000-8000-000000000001', '1 Test Street');
insert into public.listing_colleges (listing_id, college_id, is_primary) values
  ('b2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', true);

update public.listings
set status = 'published'
where id = 'b2000000-0000-4000-8000-000000000001';

insert into public.colleges (id, slug, name, state_code, city, market_status) values
  ('a0000000-0000-4000-8000-000000000098', 'paused-integrity', 'Paused integrity', 'MI', 'Ann Arbor', 'paused');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set role authenticated;

do $$
begin
  begin
    perform public.host_set_listing_facts(
      'b2000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001',
      '',
      ''
    );
    raise exception 'published listing lost its address';
  exception when check_violation then null;
  end;
  if (select address_line from public.listing_private where listing_id = 'b2000000-0000-4000-8000-000000000001') = '' then
    raise exception 'empty address was committed';
  end if;
  begin
    perform public.host_set_listing_facts(
      'b2000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000098',
      '1 Test Street',
      ''
    );
    raise exception 'published listing moved to a paused market';
  exception when check_violation then null;
  end;
  if (
    select college_id from public.listing_colleges
    where listing_id = 'b2000000-0000-4000-8000-000000000001' and is_primary
  ) <> 'a0000000-0000-4000-8000-000000000001' then
    raise exception 'primary college changed';
  end if;
  perform public.host_set_listing_facts(
    'b2000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    '2 Test Street',
    'Gate code'
  );
  if (select address_line from public.listing_private where listing_id = 'b2000000-0000-4000-8000-000000000001') <> '2 Test Street' then
    raise exception 'a valid address was not saved';
  end if;
end $$;

insert into public.listing_blocked_dates (listing_id, starts_on, ends_on)
select 'b2000000-0000-4000-8000-000000000001',
       date '2028-01-01' + n,
       date '2028-01-01' + n
from generate_series(0, 47) as n;

do $$
begin
  begin
    insert into public.listing_blocked_dates (listing_id, starts_on, ends_on)
    values ('b2000000-0000-4000-8000-000000000001', '2028-06-01', '2028-06-01');
    raise exception 'blocked date cap was not enforced';
  exception when check_violation then
    if sqlerrm not like '%blocked date limit%' then raise; end if;
  end;
end $$;

reset role;
set role anon;
do $$
begin
  if not exists (
    select 1 from public.listing_ids_blocked_between(
      array['b2000000-0000-4000-8000-000000000001']::uuid[],
      '2028-01-10',
      '2028-01-10'
    )
  ) then
    raise exception 'blocked search missed a capped range';
  end if;
end $$;

rollback;
