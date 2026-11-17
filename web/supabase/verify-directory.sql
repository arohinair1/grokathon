-- Local checks for the college directory. Rolls back its fixtures.
-- Requires migrations through 20261017060000_college_directory.sql and seed.sql.
-- Do not run this on hosted Supabase.

begin;

do $$
declare
  michigan uuid := 'a0000000-0000-4000-8000-000000000001';
  madison uuid := 'a0000000-0000-4000-8000-0000000000a1';
  twin uuid := 'a0000000-0000-4000-8000-0000000000a2';
  wisconsin bigint;
begin
  select college_count into wisconsin from public.directory_states() where code = 'WI';
  wisconsin := coalesce(wisconsin, 0);
  if (select id from public.colleges where slug = 'university-of-michigan-ann-arbor') <> michigan then
    raise exception 'University of Michigan id changed';
  end if;
  if (select market_status from public.colleges where id = michigan) <> 'active' then
    raise exception 'University of Michigan is not active';
  end if;
  if (select count(*) from public.colleges where market_status = 'active') <> 1 then
    raise exception 'more than one active college before the fixture';
  end if;

  insert into public.colleges (id, slug, name, state_code, city, market_status)
  values
    (madison, 'planned-fixture-college-madison', 'Planned fixture college', 'WI', 'Madison', 'planned'),
    (twin, 'planned-fixture-college-ann-arbor', 'Planned fixture college', 'MI', 'Ann Arbor', 'planned');
  insert into public.college_aliases (college_id, alias)
  values (michigan, 'Wolverines Directory Check');

  if (select count(*) from public.search_colleges('planned fixture', 8)) <> 2 then
    raise exception 'shared college names were collapsed';
  end if;
  if (select slug from public.search_colleges('wolverines directory', 8) limit 1) <> 'university-of-michigan-ann-arbor' then
    raise exception 'alias search missed University of Michigan';
  end if;
  if (select market_status from public.search_colleges('planned fixture', 8) limit 1) = 'active' then
    raise exception 'a planned college was returned as active';
  end if;
  if (select active_count from public.directory_states() where code = 'MI') <> 1 then
    raise exception 'Michigan active count changed';
  end if;
  if (select college_count from public.directory_states() where code = 'WI') <> wisconsin + 1 then
    raise exception 'Wisconsin directory count is wrong';
  end if;
end $$;

set role anon;
do $$
begin
  begin
    update public.colleges set market_status = 'active' where slug = 'planned-fixture-college-madison';
    raise exception 'anonymous client updated a market';
  exception
    when insufficient_privilege then null;
  end;
  begin
    insert into public.colleges (slug, name, state_code, city, market_status)
    values ('anon-college', 'Anon College', 'MI', 'Ann Arbor', 'active');
    raise exception 'anonymous client inserted a college';
  exception
    when insufficient_privilege then null;
  end;
  if (select count(*) from public.search_colleges('%', 8)) <> 0 then
    raise exception 'a wildcard search was not stripped';
  end if;
end $$;

reset role;
set role authenticated;
do $$
begin
  begin
    update public.colleges
    set market_status = 'paused'
    where slug = 'university-of-michigan-ann-arbor';
    raise exception 'authenticated client updated a market';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;
do $$
declare
  michigan uuid := 'a0000000-0000-4000-8000-000000000001';
  listing uuid;
  linked bigint;
begin
  select id into listing from public.listings where slug = 'kerrytown-garage';
  insert into public.listing_colleges (listing_id, college_id, is_primary)
  values (listing, 'a0000000-0000-4000-8000-0000000000a2', false);
  select count(*) into linked
  from public.listings
  join public.listing_colleges on listing_colleges.listing_id = listings.id
  where listings.id = listing;
  if linked <> 2 then
    raise exception 'a listing could not be linked to two colleges';
  end if;
  if (
    select count(distinct listings.id)
    from public.listings
    join public.listing_colleges on listing_colleges.listing_id = listings.id
    where listing_colleges.college_id in (michigan, 'a0000000-0000-4000-8000-0000000000a2')
      and listings.id = listing
  ) <> 1 then
    raise exception 'one listing became two results';
  end if;
  if (select public.listing_is_public(listing)) is not true then
    raise exception 'the demo listing stopped being public';
  end if;
end $$;

rollback;
