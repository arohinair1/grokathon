-- Local stand-in for Storage authorization. Run as superuser after
-- auth-shim.sql, 20261016050000_host_markets.sql, storage-shim.sql, and
-- storage-listing-photos.sql. The whole script rolls back.
-- Do not run it on the hosted project. It does not call the Storage HTTP API.
\set ON_ERROR_STOP on

begin;

insert into storage.buckets (id, name, public)
values ('other', 'other', false)
on conflict (id) do nothing;

do $$
declare
  update_policy record;
  read_policy record;
begin
  select qual, with_check into update_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'listing_photos_owner_update';
  if update_policy.qual is null or update_policy.with_check is null then
    raise exception 'storage update policy needs USING and WITH CHECK';
  end if;
  if update_policy.qual not like '%listing-photos%'
    or update_policy.with_check not like '%listing-photos%'
    or update_policy.qual not like '%listing_is_host_owned%'
    or update_policy.with_check not like '%listing_is_host_owned%'
    or update_policy.qual not like '%listing_photo_object_name_ok%'
    or update_policy.with_check not like '%listing_photo_object_name_ok%'
  then
    raise exception 'storage update policy does not lock bucket, owner, and path';
  end if;

  select qual, roles::text as roles into read_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'listing_photos_public_read';
  if read_policy.qual is null
    or read_policy.qual not like '%listing_is_public%'
    or read_policy.roles not like '%anon%'
  then
    raise exception 'public storage read policy is missing';
  end if;
  select qual, roles::text as roles into read_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'listing_photos_owner_read';
  if read_policy.qual is null
    or read_policy.qual not like '%listing_is_host_owned%'
    or read_policy.roles like '%anon%'
  then
    raise exception 'owner storage read policy is missing or includes anonymous users';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'listing_photo_objects_keep_path'
      and tgrelid = 'storage.objects'::regclass
      and not tgisinternal
  ) then
    raise exception 'storage path lock trigger is missing';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'listings_require_stored_photo'
      and tgrelid = 'public.listings'::regclass
      and not tgisinternal
  ) then
    raise exception 'stored photo publish trigger is missing';
  end if;
end $$;

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'host-a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'host-b@example.test');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

insert into public.listings (
  owner_id, slug, title, summary, description, category, space_type, neighborhood, city, state,
  price_cents, price_unit, capacity_label, available_from, available_until, dates_confirmed,
  featured, is_demo, status, sample_host_label, sort_order
) values (
  '11111111-1111-4111-8111-111111111111',
  'storage-host-a',
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
), (
  '11111111-1111-4111-8111-111111111111',
  'storage-host-a-other',
  'Other driveway',
  'A second paved driveway near campus.',
  'The second driveway is paved and empty on weekdays during the term.',
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
  501
);

select set_config('test.listing_a', id::text, true) from public.listings where slug = 'storage-host-a';
select set_config('test.listing_b', id::text, true) from public.listings where slug = 'storage-host-a-other';

insert into public.listing_private (listing_id, address_line)
select id, '100 Packard St' from public.listings where slug = 'storage-host-a';

insert into public.listing_colleges (listing_id, college_id, is_primary)
select id, 'a0000000-0000-4000-8000-000000000001', true
from public.listings
where slug = 'storage-host-a';

insert into public.listing_photos (listing_id, path, alt, sort_order, is_primary)
select id, id::text || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg', 'Driveway', 0, true
from public.listings
where slug = 'storage-host-a';

do $$
begin
  update public.listings
  set status = 'published'
  where slug = 'storage-host-a';
  raise exception 'published without a storage object';
exception
  when check_violation then null;
end $$;

do $$
begin
  if (
    select status from public.listings where slug = 'storage-host-a'
  ) <> 'draft' then
    raise exception 'failed publish changed the listing status';
  end if;
end $$;

insert into storage.objects (id, bucket_id, name)
select
  '44444444-4444-4444-8444-444444444441',
  'listing-photos',
  current_setting('test.listing_a') || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg';

do $$
begin
  insert into storage.objects (bucket_id, name)
  values ('other', current_setting('test.listing_a') || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg');
  raise exception 'cross-bucket insert succeeded';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  insert into storage.objects (bucket_id, name)
  values ('listing-photos', current_setting('test.listing_a') || '/../secret.jpg');
  raise exception 'invalid photo path insert succeeded';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  insert into storage.objects (bucket_id, name)
  values (
    'listing-photos',
    '99999999-9999-4999-8999-999999999999/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg'
  );
  raise exception 'object inserted into a listing the host does not own';
exception
  when insufficient_privilege then null;
end $$;

update public.listings
set status = 'published'
where slug = 'storage-host-a';

insert into storage.objects (id, bucket_id, name)
select
  '44444444-4444-4444-8444-444444444442',
  'listing-photos',
  current_setting('test.listing_a') || '/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg';

reset role;
select set_config('request.jwt.claims', '', true);
set role anon;

do $$
begin
  if (
    select count(*) from storage.objects
    where id = '44444444-4444-4444-8444-444444444441'
  ) <> 1 then
    raise exception 'anonymous reader cannot see a published photo object';
  end if;
  if (
    select count(*) from storage.objects
    where id = '44444444-4444-4444-8444-444444444442'
  ) <> 0 then
    raise exception 'anonymous reader can see an object with no photo row';
  end if;
end $$;

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

update public.listings
set status = 'draft'
where slug = 'storage-host-a';

reset role;
select set_config('request.jwt.claims', '', true);
set role anon;

do $$
begin
  if (
    select count(*) from storage.objects
    where id = '44444444-4444-4444-8444-444444444441'
  ) <> 0 then
    raise exception 'anonymous reader can see an unpublished photo object';
  end if;
end $$;

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from storage.objects) <> 0 then
    raise exception 'another host can read a draft photo object';
  end if;
  update storage.objects
  set metadata = '{"taken":true}'::jsonb
  where id = '44444444-4444-4444-8444-444444444441';
  if found then
    raise exception 'another host updated the photo object';
  end if;
  delete from storage.objects where id = '44444444-4444-4444-8444-444444444441';
  if found then
    raise exception 'another host deleted the photo object';
  end if;
  begin
    insert into storage.objects (bucket_id, name)
    values (
      'listing-photos',
      current_setting('test.listing_a') || '/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg'
    );
    raise exception 'another host inserted into the listing folder';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

do $$
begin
  if (
    select count(*) from storage.objects
    where id = '44444444-4444-4444-8444-444444444441'
  ) <> 1 then
    raise exception 'owner cannot read a draft photo object';
  end if;
end $$;

do $$
begin
  update storage.objects
  set metadata = '{"ok":true}'::jsonb
  where id = '44444444-4444-4444-8444-444444444441';
  if not found then
    raise exception 'owner could not update photo metadata';
  end if;
end $$;

do $$
begin
  update storage.objects
  set bucket_id = 'other'
  where id = '44444444-4444-4444-8444-444444444441';
  raise exception 'cross-bucket move succeeded';
exception
  when check_violation or insufficient_privilege then null;
end $$;

do $$
begin
  if (
    select bucket_id from storage.objects
    where id = '44444444-4444-4444-8444-444444444441'
  ) <> 'listing-photos' then
    raise exception 'cross-bucket move changed the bucket';
  end if;
end $$;

do $$
begin
  update storage.objects
  set name = current_setting('test.listing_b') || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'
  where id = '44444444-4444-4444-8444-444444444441';
  raise exception 'cross-listing move succeeded';
exception
  when check_violation or insufficient_privilege then null;
end $$;

do $$
begin
  if (
    select name from storage.objects
    where id = '44444444-4444-4444-8444-444444444441'
  ) <> current_setting('test.listing_a') || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg' then
    raise exception 'cross-listing move changed the object path';
  end if;
end $$;

update public.listings
set status = 'published'
where slug = 'storage-host-a';

do $$
begin
  delete from public.listing_photos
  where path = current_setting('test.listing_a') || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg';
  raise exception 'deleted the last photo row of a published listing';
exception
  when check_violation then null;
end $$;

do $$
begin
  delete from storage.objects where id = '44444444-4444-4444-8444-444444444441';
  raise exception 'deleted the last stored photo of a published listing';
exception
  when check_violation then null;
end $$;

do $$
begin
  if (
    select count(*) from storage.objects
    where id = '44444444-4444-4444-8444-444444444441'
  ) <> 1 then
    raise exception 'the last stored photo is gone';
  end if;
  if (
    select count(*) from public.listing_photos
    where listing_id = current_setting('test.listing_a')::uuid
  ) <> 1 then
    raise exception 'the last photo row is gone';
  end if;
end $$;

insert into public.listing_photos (listing_id, path, alt, sort_order, is_primary)
select current_setting('test.listing_a')::uuid,
  current_setting('test.listing_a') || '/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg',
  'Second',
  1,
  false;

delete from public.listing_photos
where path = current_setting('test.listing_a') || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg';

delete from storage.objects where id = '44444444-4444-4444-8444-444444444441';

do $$
begin
  if (
    select count(*) from public.listing_photos
    where listing_id = current_setting('test.listing_a')::uuid
  ) <> 1 then
    raise exception 'published listing lost its remaining photo row';
  end if;
  if (
    select status from public.listings where slug = 'storage-host-a'
  ) <> 'published' then
    raise exception 'removing one extra photo unpublished the listing';
  end if;
end $$;

reset role;

do $$
begin
  if (select count(*) from public.listings where is_demo and status = 'published') <> 8 then
    raise exception 'storage checks changed the demo catalog';
  end if;
  if (select count(*) from public.listing_photos where path like '/images/%') <> 9 then
    raise exception 'storage checks changed existing images';
  end if;
end $$;

rollback;
