-- Run as a superuser after the migration and seed.
\set ON_ERROR_STOP on

do $$
declare
  t text;
  p text;
begin
  foreach t in array array['public.listings', 'public.listing_photos'] loop
    foreach p in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if has_table_privilege('anon', t, p) then
        raise exception 'anon has % on %', p, t;
      end if;
    end loop;
    foreach p in array array['TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if has_table_privilege('authenticated', t, p) then
        raise exception 'authenticated has % on %', p, t;
      end if;
    end loop;
  end loop;
  if has_column_privilege('anon', 'public.listings', 'owner_id', 'SELECT') then
    raise exception 'anon can select owner_id';
  end if;
  if has_column_privilege('authenticated', 'public.listings', 'owner_id', 'SELECT') then
    raise exception 'authenticated can select owner_id';
  end if;
  if not has_column_privilege('authenticated', 'public.listings', 'owner_id', 'INSERT') then
    raise exception 'authenticated cannot insert owner_id';
  end if;
  if has_column_privilege('authenticated', 'public.listings', 'owner_id', 'UPDATE') then
    raise exception 'authenticated can update owner_id';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('listings', 'listing_photos')
      and cmd <> 'SELECT'
      and roles && array['anon', 'public']::name[]
  ) then
    raise exception 'anon has a write policy on the public catalog';
  end if;
end $$;

do $$
begin
  if (select count(*) from public.listings where status = 'published') <> 8 then
    raise exception 'expected 8 published listings';
  end if;
  if (select count(*) from public.listings) <> 9 then
    raise exception 'expected 9 listings including the draft';
  end if;
end $$;

set role anon;

do $$
begin
  if (select count(*) from public.listings) <> 8 then
    raise exception 'anon should see only published listings';
  end if;
  if (select count(*) from public.listings where slug = 'hidden-sample-draft') <> 0 then
    raise exception 'anon can see the draft';
  end if;
  if (select count(*) from public.listing_photos) <> 8 then
    raise exception 'anon can see a photo for an unpublished listing';
  end if;
  begin
    insert into public.listings (
      slug, title, summary, description, category, space_type, neighborhood,
      city, state, price_cents, price_unit, capacity_label, available_from,
      available_until, sample_host_label, sort_order
    ) values (
      'should-fail', 'x', 'x', 'x', 'storage', 'Garage', 'Kerrytown',
      'Ann Arbor', 'MI', 1, 'day', 'x', '2026-01-01', '2026-01-02', 'X.', 100
    );
    raise exception 'anon insert was allowed';
  exception
    when insufficient_privilege then
      null;
  end;
end $$;

reset role;
