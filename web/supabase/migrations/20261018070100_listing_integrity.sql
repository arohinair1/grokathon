-- Keep a published listing publishable after later edits, and keep
-- date search from missing a blocked range.
-- Do not apply this to hosted Supabase until approved.
-- It does not change market_status or the Ann Arbor row.

create or replace function public.published_listing_details_ok()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.listings as listing
    where listing.status = 'published'
      and listing.is_demo = false
      and (
        not exists (
          select 1
          from public.listing_private as private
          where private.listing_id = listing.id
            and char_length(btrim(private.address_line)) > 0
        )
        or not exists (
          select 1
          from public.listing_colleges as link
          join public.colleges as college on college.id = link.college_id
          where link.listing_id = listing.id
            and link.is_primary
            and college.market_status = 'active'
        )
        or not exists (
          select 1 from public.listing_photos as photo where photo.listing_id = listing.id
        )
      )
  ) then
    raise exception 'listing is not publishable' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

drop trigger if exists listing_private_keep_published on public.listing_private;
create trigger listing_private_keep_published
  after insert or update or delete on public.listing_private
  for each statement execute function public.published_listing_details_ok();

drop trigger if exists listing_colleges_keep_published on public.listing_colleges;
create trigger listing_colleges_keep_published
  after insert or update or delete on public.listing_colleges
  for each statement execute function public.published_listing_details_ok();

create or replace function public.limit_blocked_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*)
    from public.listing_blocked_dates
    where listing_id = new.listing_id
  ) >= 48 then
    raise exception 'blocked date limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists listing_blocked_dates_limit on public.listing_blocked_dates;
create trigger listing_blocked_dates_limit
  before insert on public.listing_blocked_dates
  for each row execute function public.limit_blocked_dates();

create or replace function public.listing_ids_blocked_between(
  p_ids uuid[],
  p_start date,
  p_end date
)
returns table (listing_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct blocked.listing_id
  from public.listing_blocked_dates as blocked
  where cardinality(coalesce(p_ids, '{}'::uuid[])) between 1 and 200
    and blocked.listing_id = any(p_ids)
    and blocked.starts_on <= p_end
    and p_start <= blocked.ends_on;
$$;

create or replace function public.host_set_listing_facts(
  p_listing uuid,
  p_college uuid,
  p_address text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.listing_is_host_owned(p_listing) then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  if p_college is not null then
    insert into public.listing_colleges (listing_id, college_id, is_primary)
    values (p_listing, p_college, false)
    on conflict (listing_id, college_id) do nothing;
    update public.listing_colleges
    set is_primary = (college_id = p_college)
    where listing_id = p_listing;
    delete from public.listing_colleges
    where listing_id = p_listing
      and college_id <> p_college;
  else
    delete from public.listing_colleges where listing_id = p_listing;
  end if;
  insert into public.listing_private (listing_id, address_line, access_notes)
  values (p_listing, left(coalesce(p_address, ''), 200), left(coalesce(p_notes, ''), 1000))
  on conflict (listing_id) do update
  set address_line = excluded.address_line,
      access_notes = excluded.access_notes;
end;
$$;

revoke all on function public.published_listing_details_ok() from public, anon, authenticated;
revoke all on function public.host_set_listing_facts(uuid, uuid, text, text) from public, anon;
grant execute on function public.host_set_listing_facts(uuid, uuid, text, text) to authenticated;
revoke all on function public.limit_blocked_dates() from public, anon;
revoke all on function public.listing_ids_blocked_between(uuid[], date, date) from public;
grant execute on function public.limit_blocked_dates() to authenticated;
grant execute on function public.listing_ids_blocked_between(uuid[], date, date) to anon, authenticated;
