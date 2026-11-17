-- Hosted Storage setup for listing photos.
-- Apply web/supabase/migrations/20261016050000_host_markets.sql first.
-- Do not apply this file to the hosted project without approval.
-- A local Postgres check has no Storage schema; web/supabase/storage-shim.sql
-- is a test stand-in and must not be applied to the hosted project.
--
-- Publishing a non-demo listing requires every non-static photo row to have an
-- object in this bucket. Deleting the last stored photo of a published listing
-- is rejected. The application also checks the bucket before publish, and it
-- removes a storage object only after the database row delete succeeds.

do $$
begin
  if to_regprocedure('public.listing_is_host_owned(uuid)') is null
    or to_regprocedure('public.listing_is_public(uuid)') is null
  then
    raise exception 'apply 20261016050000_host_markets.sql before storage-listing-photos.sql';
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.listing_id_from_photo_path(object_name text)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  folder text;
begin
  folder := (storage.foldername(object_name))[1];
  if folder is null
    or folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    return null;
  end if;
  return folder::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.listing_photo_object_name_ok(object_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select object_name is not null
    and position('..' in object_name) = 0
    and object_name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9._-]+$';
$$;

revoke all on function public.listing_id_from_photo_path(text) from public;
revoke all on function public.listing_photo_object_name_ok(text) from public;
grant execute on function public.listing_id_from_photo_path(text) to anon, authenticated;
grant execute on function public.listing_photo_object_name_ok(text) to anon, authenticated;
revoke execute on function public.listing_is_host_owned(uuid) from anon;

create or replace function public.listing_photos_are_stored(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listing_photos as photos
    where photos.listing_id = target
  )
  and not exists (
    select 1
    from public.listing_photos as photos
    where photos.listing_id = target
      and photos.path not like '/images/%'
      and not exists (
        select 1
        from storage.objects as objects
        where objects.bucket_id = 'listing-photos'
          and objects.name = photos.path
      )
  );
$$;

create or replace function public.listings_require_stored_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and new.is_demo = false then
    if not public.listing_photos_are_stored(new.id) then
      raise exception 'listing photo is not stored' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_require_stored_photo on public.listings;
create trigger listings_require_stored_photo
  before update on public.listings
  for each row execute function public.listings_require_stored_photo();

create or replace function public.listing_photo_objects_keep_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.bucket_id = 'listing-photos' or new.bucket_id = 'listing-photos' then
    if new.bucket_id is distinct from old.bucket_id
      or new.name is distinct from old.name
    then
      raise exception 'listing photo object cannot move' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_photo_objects_keep_path on storage.objects;
create trigger listing_photo_objects_keep_path
  before update of bucket_id, name on storage.objects
  for each row execute function public.listing_photo_objects_keep_path();

create or replace function public.listing_photo_objects_keep_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing uuid;
begin
  if old.bucket_id <> 'listing-photos' then
    return old;
  end if;

  select photos.listing_id
  into listing
  from public.listing_photos as photos
  where photos.path = old.name
  limit 1;

  if listing is null then
    return old;
  end if;

  perform 1
  from public.listings
  where id = listing
    and status = 'published'
    and is_demo = false
  for update;

  if found and not exists (
    select 1
    from public.listing_photos as other
    join storage.objects as remaining
      on remaining.bucket_id = 'listing-photos'
     and remaining.name = other.path
    where other.listing_id = listing
      and other.path is distinct from old.name
      and remaining.id is distinct from old.id
  ) then
    raise exception 'published listing needs a stored photo' using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

drop trigger if exists listing_photo_objects_keep_cover on storage.objects;
create trigger listing_photo_objects_keep_cover
  before delete on storage.objects
  for each row execute function public.listing_photo_objects_keep_cover();

revoke all on function public.listing_photos_are_stored(uuid) from public, anon, authenticated;
revoke all on function public.listings_require_stored_photo() from public, anon, authenticated;
revoke all on function public.listing_photo_objects_keep_path() from public, anon, authenticated;
revoke all on function public.listing_photo_objects_keep_cover() from public, anon, authenticated;

drop policy if exists listing_photos_owner_insert on storage.objects;
create policy listing_photos_owner_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-photos'
    and public.listing_photo_object_name_ok(name)
    and public.listing_is_host_owned(public.listing_id_from_photo_path(name))
  );

drop policy if exists listing_photos_owner_update on storage.objects;
create policy listing_photos_owner_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and public.listing_photo_object_name_ok(name)
    and public.listing_is_host_owned(public.listing_id_from_photo_path(name))
  )
  with check (
    bucket_id = 'listing-photos'
    and public.listing_photo_object_name_ok(name)
    and public.listing_is_host_owned(public.listing_id_from_photo_path(name))
  );

drop policy if exists listing_photos_owner_delete on storage.objects;
create policy listing_photos_owner_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and public.listing_photo_object_name_ok(name)
    and public.listing_is_host_owned(public.listing_id_from_photo_path(name))
  );

drop policy if exists listing_photos_read on storage.objects;
drop policy if exists listing_photos_public_read on storage.objects;
create policy listing_photos_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'listing-photos'
    and public.listing_photo_object_name_ok(name)
    and public.listing_is_public(public.listing_id_from_photo_path(name))
    and exists (
      select 1
      from public.listing_photos as photos
      where photos.listing_id = public.listing_id_from_photo_path(name)
        and photos.path = name
    )
  );

drop policy if exists listing_photos_owner_read on storage.objects;
create policy listing_photos_owner_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and public.listing_photo_object_name_ok(name)
    and public.listing_is_host_owned(public.listing_id_from_photo_path(name))
  );
