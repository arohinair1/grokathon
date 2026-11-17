-- Local booking lifecycle checks. The whole script rolls back.
-- Run as superuser after auth-shim.sql, the catalog, seed, profiles, and
-- 20261018070000_booking_requests.sql. Do not run this on the hosted project.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'host-a@example.test', '{"display_name":"Host A"}'),
  ('33333333-3333-4333-8333-333333333333', 'renter-a@example.test', '{"display_name":"Renter A"}'),
  ('44444444-4444-4444-8444-444444444444', 'renter-b@example.test', '{"display_name":"Renter B"}');

do $$
begin
  if (select count(*) from public.listings where is_demo and status = 'published') <> 8 then
    raise exception 'demo catalog changed before booking checks';
  end if;
  if (select market_status from public.colleges where id = 'a0000000-0000-4000-8000-000000000001') <> 'active' then
    raise exception 'Ann Arbor is not active';
  end if;
  if has_table_privilege('anon', 'public.booking_requests', 'SELECT')
    or has_table_privilege('authenticated', 'public.booking_requests', 'INSERT')
    or has_table_privilege('authenticated', 'public.booking_requests', 'UPDATE')
    or has_table_privilege('authenticated', 'public.booking_requests', 'DELETE')
    or has_table_privilege('authenticated', 'public.booking_requests', 'SELECT')
    or not has_column_privilege('authenticated', 'public.booking_requests', 'status', 'SELECT')
    or has_column_privilege('anon', 'public.booking_requests', 'renter_id', 'SELECT')
  then
    raise exception 'booking table privileges are wrong';
  end if;
end $$;

insert into public.listings (
  id, owner_id, slug, title, summary, description, category, space_type, neighborhood, city, state,
  price_cents, price_unit, capacity_label, available_from, available_until, dates_confirmed,
  featured, is_demo, status, sample_host_label, sort_order
) values (
  'b1000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'host-a-bookable',
  'Bookable driveway',
  'A paved driveway near campus.',
  'The driveway is paved and empty on weekdays during the term.',
  'monthly-parking',
  'Driveway',
  'Burns Park',
  'Ann Arbor',
  'MI',
  4000,
  'day',
  'One car',
  '2027-01-01',
  '2027-12-31',
  true,
  false,
  false,
  'published',
  'Public Host',
  500
);

insert into public.listing_photos (listing_id, path, alt, sort_order, is_primary) values
  ('b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001/cover.jpg', 'Driveway', 0, true);

insert into public.listing_private (listing_id, address_line) values
  ('b1000000-0000-4000-8000-000000000001', '1 Test Street');

insert into public.listing_colleges (listing_id, college_id, is_primary) values
  ('b1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', true);

do $$
begin
  if to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public)
    values ('listing-photos', 'listing-photos', false)
    on conflict (id) do nothing;
    insert into storage.objects (bucket_id, name)
    values ('listing-photos', 'b1000000-0000-4000-8000-000000000001/cover.jpg')
    on conflict (bucket_id, name) do nothing;
  end if;
end $$;

create temp table booking_probe (label text primary key, id uuid);
grant all on booking_probe to authenticated;
create temp table fixture_ids (label text primary key, id uuid);
insert into fixture_ids (label, id)
select 'draft', id from public.listings where slug = 'hidden-sample-draft';
insert into fixture_ids (label, id)
select 'demo', id from public.listings where is_demo and status = 'published' order by slug limit 1;
grant select on fixture_ids to authenticated;

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set role authenticated;

insert into booking_probe (label, id)
values ('a', public.request_booking('b1000000-0000-4000-8000-000000000001', '2027-06-01', '2027-06-05'));

do $$
declare
  again uuid;
begin
  again := public.request_booking('b1000000-0000-4000-8000-000000000001', '2027-06-01', '2027-06-05');
  if again <> (select id from booking_probe where label = 'a') then
    raise exception 'repeat request created a second pending row';
  end if;
end $$;

do $$
begin
  begin
    perform public.request_booking('b1000000-0000-4000-8000-000000000001', '2027-06-08', '2027-06-01');
    raise exception 'reversed dates were accepted';
  exception when invalid_parameter_value or check_violation then
    if sqlerrm not like '%booking_invalid_dates%' then raise; end if;
  end;
  begin
    perform public.request_booking('b1000000-0000-4000-8000-000000000001', '2020-01-01', '2020-01-02');
    raise exception 'past dates were accepted';
  exception when invalid_parameter_value then
    if sqlerrm not like '%booking_invalid_dates%' then raise; end if;
  end;
  begin
    perform public.request_booking(
      (select id from fixture_ids where label = 'demo'),
      '2027-06-01',
      '2027-06-02'
    );
    raise exception 'demo listing accepted a request';
  exception when raise_exception then
    if sqlerrm not like '%booking_not_requestable%' then raise; end if;
  end;
  begin
    perform public.request_booking(
      (select id from fixture_ids where label = 'draft'),
      '2027-06-01',
      '2027-06-02'
    );
    raise exception 'draft listing accepted a request';
  exception when raise_exception then
    if sqlerrm not like '%booking_not_requestable%' then raise; end if;
  end;
end $$;

reset role;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set role authenticated;

do $$
begin
  begin
    perform public.request_booking('b1000000-0000-4000-8000-000000000001', '2027-09-01', '2027-09-02');
    raise exception 'host requested their own listing';
  exception when raise_exception then
    if sqlerrm not like '%booking_own_listing%' then raise; end if;
  end;
end $$;

reset role;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
set role authenticated;

insert into booking_probe (label, id)
values ('b', public.request_booking('b1000000-0000-4000-8000-000000000001', '2027-06-04', '2027-06-08'));

do $$
begin
  if (select count(*) from public.booking_requests) <> 1 then
    raise exception 'renter B can see another renter request';
  end if;
end $$;

reset role;
do $$
begin
  if (select count(*) from public.booking_requests where status = 'pending' and listing_id = 'b1000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'overlapping pending requests were not both kept';
  end if;
end $$;

reset role;
set role anon;
do $$
begin
  begin
    perform public.request_booking('b1000000-0000-4000-8000-000000000001', '2027-10-01', '2027-10-02');
    raise exception 'anon requested a listing';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set role authenticated;
select public.accept_booking((select id from booking_probe where label = 'a'));

do $$
begin
  if (select status from public.booking_requests where id = (select id from booking_probe where label = 'a')) <> 'accepted' then
    raise exception 'host accept did not stick';
  end if;
  begin
    perform public.accept_booking((select id from booking_probe where label = 'b'));
    raise exception 'overlapping accept succeeded';
  exception when raise_exception then
    if sqlerrm not like '%booking_conflict%' then raise; end if;
  end;
  perform public.decline_booking((select id from booking_probe where label = 'b'));
  if (select status from public.booking_requests where id = (select id from booking_probe where label = 'b')) <> 'declined' then
    raise exception 'decline did not stick';
  end if;
  begin
    perform public.cancel_booking((select id from booking_probe where label = 'a'));
    raise exception 'host cancelled a renter request';
  exception when insufficient_privilege then
    if sqlerrm not like '%booking_forbidden%' then raise; end if;
  end;
  begin
    insert into public.listing_blocked_dates (listing_id, starts_on, ends_on)
    values ('b1000000-0000-4000-8000-000000000001', '2027-06-02', '2027-06-02');
    raise exception 'blocked an accepted date';
  exception when raise_exception then
    if sqlerrm not like '%accepted_reservation%' then raise; end if;
  end;
  begin
    update public.listings
    set available_until = '2027-06-04'
    where id = 'b1000000-0000-4000-8000-000000000001';
    raise exception 'shrunk the window through an accepted reservation';
  exception when raise_exception then
    if sqlerrm not like '%accepted_reservation%' then raise; end if;
  end;
end $$;

update public.listings
set available_until = '2027-06-05'
where id = 'b1000000-0000-4000-8000-000000000001';

do $$
begin
  if public.booking_counterparty_name((select id from booking_probe where label = 'a')) <> 'Renter A' then
    raise exception 'host did not see the renter display name';
  end if;
end $$;

reset role;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set role authenticated;

do $$
begin
  begin
    perform public.accept_booking((select id from booking_probe where label = 'a'));
    raise exception 'renter accepted a request';
  exception when insufficient_privilege then
    if sqlerrm not like '%booking_forbidden%' then raise; end if;
  end;
  begin
    perform public.cancel_booking((select id from booking_probe where label = 'a'));
    raise exception 'renter cancelled an accepted request';
  exception when raise_exception then
    if sqlerrm not like '%booking_terminal%' then raise; end if;
  end;
  begin
    perform public.request_booking('b1000000-0000-4000-8000-000000000001', '2027-06-03', '2027-06-04');
    raise exception 'request overlapped an accepted reservation';
  exception when raise_exception then
    if sqlerrm not like '%booking_unavailable%' then raise; end if;
  end;
  if public.booking_counterparty_name((select id from booking_probe where label = 'a')) <> 'Public Host' then
    raise exception 'renter saw a name other than the public host label';
  end if;
  if public.booking_counterparty_name((select id from booking_probe where label = 'a')) = 'Host A' then
    raise exception 'renter saw the host profile name';
  end if;
end $$;

reset role;
update public.listings
set available_until = '2027-12-31'
where id = 'b1000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set role authenticated;
insert into booking_probe (label, id)
values ('c', public.request_booking('b1000000-0000-4000-8000-000000000001', '2027-07-01', '2027-07-03'));
select public.cancel_booking((select id from booking_probe where label = 'c'));

do $$
begin
  if (select status from public.booking_requests where id = (select id from booking_probe where label = 'c')) <> 'cancelled' then
    raise exception 'renter cancel did not stick';
  end if;
  begin
    update public.booking_requests set status = 'accepted' where id = (select id from booking_probe where label = 'c');
    raise exception 'renter updated booking status directly';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
set role authenticated;
do $$
begin
  if public.booking_counterparty_name((select id from booking_probe where label = 'a')) is not null then
    raise exception 'another renter saw a counterparty name';
  end if;
  if exists (select 1 from public.booking_requests where id = (select id from booking_probe where label = 'a')) then
    raise exception 'another renter read a private request';
  end if;
end $$;

reset role;
set role anon;
do $$
begin
  if (select count(*) from public.listing_reserved_spans('b1000000-0000-4000-8000-000000000001')) <> 1 then
    raise exception 'public reserved span missing';
  end if;
  if exists (
    select 1 from public.listing_reserved_spans('b1000000-0000-4000-8000-000000000001') span
    where span.starts_on <> '2027-06-01' or span.ends_on <> '2027-06-05'
  ) then
    raise exception 'public reserved span leaked the wrong dates';
  end if;
end $$;
reset role;

do $$
begin
  begin
    update public.booking_requests set status = 'cancelled' where status = 'accepted';
    raise exception 'superuser bypassed the booking guard';
  exception when insufficient_privilege then
    if sqlerrm not like '%booking_forbidden%' then raise; end if;
  end;
  begin
    set role service_role;
    update public.booking_requests set status = 'cancelled' where status = 'accepted';
    raise exception 'service role bypassed the booking guard';
  exception when insufficient_privilege then
    if sqlerrm not like '%booking_forbidden%' and sqlerrm not like '%permission denied%' then raise; end if;
  end;
end $$;
reset role;

do $$
begin
  begin
    delete from public.listings where id = 'b1000000-0000-4000-8000-000000000001';
    raise exception 'listing with a booking was deleted';
  exception when foreign_key_violation then null;
  end;
end $$;

insert into public.colleges (id, slug, name, state_code, city, market_status) values
  ('a0000000-0000-4000-8000-000000000099', 'paused-booking-fixture', 'Paused booking fixture', 'MI', 'Ann Arbor', 'paused');

insert into public.listings (
  id, owner_id, slug, title, summary, description, category, space_type, neighborhood, city, state,
  price_cents, price_unit, capacity_label, available_from, available_until, dates_confirmed,
  featured, is_demo, status, sample_host_label, sort_order
) values (
  'b1000000-0000-4000-8000-000000000002',
  '11111111-1111-4111-8111-111111111111',
  'paused-market-listing',
  'Paused market driveway',
  'A paved driveway near a paused campus.',
  'The driveway is paved and empty on weekdays during the term.',
  'monthly-parking',
  'Driveway',
  'Burns Park',
  'Ann Arbor',
  'MI',
  4000,
  'day',
  'One car',
  '2027-01-01',
  '2027-12-31',
  true,
  false,
  false,
  'published',
  'Host A',
  501
);

insert into public.listing_colleges (listing_id, college_id, is_primary) values
  ('b1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000099', true);

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set role authenticated;
do $$
begin
  begin
    perform public.request_booking('b1000000-0000-4000-8000-000000000002', '2027-11-01', '2027-11-02');
    raise exception 'paused market accepted a request';
  exception when raise_exception then
    if sqlerrm not like '%booking_not_requestable%' then raise; end if;
  end;
end $$;

reset role;
update public.listings
set available_until = '2027-12-31'
where id = 'b1000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set role authenticated;
insert into booking_probe (label, id)
values ('d', public.request_booking('b1000000-0000-4000-8000-000000000001', '2027-08-01', '2027-08-02'));

reset role;
update public.listings set status = 'draft' where id = 'b1000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set role authenticated;
do $$
begin
  begin
    perform public.accept_booking((select id from booking_probe where label = 'd'));
    raise exception 'unpublished listing accepted a request';
  exception when raise_exception then
    if sqlerrm not like '%booking_not_requestable%' then raise; end if;
  end;
end $$;

reset role;
set role anon;
do $$
begin
  if exists (
    select 1 from public.listings
    where id = 'b1000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'unpublished listing stayed in the public catalog';
  end if;
  if (select count(*) from public.listings where is_demo and status = 'published') <> 8 then
    raise exception 'demo catalog changed';
  end if;
end $$;

rollback;
