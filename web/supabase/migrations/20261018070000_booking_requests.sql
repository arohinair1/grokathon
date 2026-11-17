-- Nonbinding booking requests. Do not apply this to hosted Supabase until approved.
-- Does not change colleges, market_status, or the Ann Arbor row.
-- Does not depend on 20261017060000_college_directory.sql.
--
-- Dates are inclusive calendar dates, matching listing windows and blocked dates.
-- "Today" is America/Detroit. Pending requests may overlap. Accepted reservations
-- may not. Accepted, declined, and cancelled rows are terminal in this milestone:
-- neither the renter nor the host can cancel an accepted reservation here.
-- A renter cannot request their own listing. Demo, draft, unpublished, and
-- inactive-market listings cannot be requested.
-- Clients have no insert, update, or delete grant. Transitions go through the
-- functions below, which lock the listing row before an acceptance.

do $$
begin
  if not exists (select 1 from pg_catalog.pg_extension where extname = 'btree_gist') then
    execute 'create schema if not exists extensions';
    execute 'create extension btree_gist with schema extensions';
  end if;
end $$;

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  renter_id uuid not null references auth.users (id) on delete restrict,
  starts_on date not null,
  ends_on date not null,
  status text not null check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  price_cents integer not null check (price_cents > 0),
  price_unit public.price_unit not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint booking_requests_order check (ends_on >= starts_on),
  constraint booking_requests_span check ((ends_on - starts_on) <= 365)
);

create index if not exists booking_requests_listing_status_idx
  on public.booking_requests (listing_id, status, starts_on, ends_on);

create index if not exists booking_requests_renter_created_idx
  on public.booking_requests (renter_id, created_at desc);

create unique index if not exists booking_requests_one_pending_span
  on public.booking_requests (renter_id, listing_id, starts_on, ends_on)
  where status = 'pending';

alter table public.booking_requests
  drop constraint if exists booking_requests_no_accepted_overlap;

set search_path = public, extensions;

alter table public.booking_requests
  add constraint booking_requests_no_accepted_overlap
  exclude using gist (
    listing_id with =,
    daterange(starts_on, ends_on, '[]') with &&
  )
  where (status = 'accepted');

set search_path = public;

create or replace function public.booking_requests_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('app.booking_transition', true) is distinct from 'allowed' then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and new.status <> 'pending' then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (
    new.listing_id is distinct from old.listing_id
    or new.renter_id is distinct from old.renter_id
    or new.starts_on is distinct from old.starts_on
    or new.ends_on is distinct from old.ends_on
    or new.price_cents is distinct from old.price_cents
    or new.price_unit is distinct from old.price_unit
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists booking_requests_guard on public.booking_requests;
create trigger booking_requests_guard
  before insert or update or delete on public.booking_requests
  for each row execute function public.booking_requests_guard();

create or replace function public.booking_detroit_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (pg_catalog.timezone('America/Detroit', pg_catalog.now()))::pg_catalog.date;
$$;

create or replace function public.listings_keep_accepted_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.available_from is distinct from old.available_from
    or new.available_until is distinct from old.available_until
  then
    if exists (
      select 1
      from public.booking_requests as req
      where req.listing_id = new.id
        and req.status = 'accepted'
        and (req.starts_on < new.available_from or req.ends_on > new.available_until)
    ) then
      raise exception 'accepted_reservation' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_keep_accepted_window on public.listings;
create trigger listings_keep_accepted_window
  before update on public.listings
  for each row execute function public.listings_keep_accepted_window();

create or replace function public.listing_blocked_dates_keep_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.listings where id = new.listing_id for update;
  if exists (
    select 1
    from public.booking_requests as req
    where req.listing_id = new.listing_id
      and req.status = 'accepted'
      and req.starts_on <= new.ends_on
      and new.starts_on <= req.ends_on
  ) then
    raise exception 'accepted_reservation' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists listing_blocked_dates_keep_accepted on public.listing_blocked_dates;
create trigger listing_blocked_dates_keep_accepted
  before insert or update on public.listing_blocked_dates
  for each row execute function public.listing_blocked_dates_keep_accepted();

create or replace function public.request_booking(
  p_listing_id uuid,
  p_starts_on date,
  p_ends_on date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_demo boolean;
  v_from date;
  v_until date;
  v_price integer;
  v_unit public.price_unit;
  v_existing uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  if p_listing_id is null
    or p_starts_on is null
    or p_ends_on is null
    or p_ends_on < p_starts_on
    or (p_ends_on - p_starts_on) > 365
    or p_starts_on < public.booking_detroit_today()
  then
    raise exception 'booking_invalid_dates' using errcode = '22023';
  end if;

  select owner_id, is_demo, available_from, available_until, price_cents, price_unit
    into v_owner, v_demo, v_from, v_until, v_price, v_unit
  from public.listings
  where id = p_listing_id
  for update;

  if not found or v_demo or v_owner is null or not public.listing_is_public(p_listing_id) then
    raise exception 'booking_not_requestable' using errcode = 'P0001';
  end if;
  if v_owner = v_uid then
    raise exception 'booking_own_listing' using errcode = 'P0001';
  end if;
  if p_starts_on < v_from or p_ends_on > v_until or v_price is null or v_price <= 0 then
    raise exception 'booking_invalid_dates' using errcode = '22023';
  end if;

  select id into v_existing
  from public.booking_requests
  where renter_id = v_uid
    and listing_id = p_listing_id
    and starts_on = p_starts_on
    and ends_on = p_ends_on
    and status = 'pending';
  if v_existing is not null then
    return v_existing;
  end if;

  if exists (
    select 1 from public.listing_blocked_dates as blocked
    where blocked.listing_id = p_listing_id
      and blocked.starts_on <= p_ends_on
      and p_starts_on <= blocked.ends_on
  ) or exists (
    select 1 from public.booking_requests as req
    where req.listing_id = p_listing_id
      and req.status = 'accepted'
      and req.starts_on <= p_ends_on
      and p_starts_on <= req.ends_on
  ) then
    raise exception 'booking_unavailable' using errcode = 'P0001';
  end if;

  perform pg_catalog.set_config('app.booking_transition', 'allowed', true);
  insert into public.booking_requests (
    listing_id, renter_id, starts_on, ends_on, status, price_cents, price_unit
  ) values (
    p_listing_id, v_uid, p_starts_on, p_ends_on, 'pending', v_price, v_unit
  )
  returning id into v_id;
  perform pg_catalog.set_config('app.booking_transition', '', true);
  return v_id;
exception
  when unique_violation then
    perform pg_catalog.set_config('app.booking_transition', '', true);
    select id into v_existing
    from public.booking_requests
    where renter_id = v_uid
      and listing_id = p_listing_id
      and starts_on = p_starts_on
      and ends_on = p_ends_on
      and status = 'pending';
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end;
$$;

create or replace function public.accept_booking(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_listing_id uuid;
  v_owner uuid;
  v_demo boolean;
  v_from date;
  v_until date;
  v_status text;
  v_start date;
  v_end date;
begin
  if v_uid is null or p_request_id is null then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;

  select listing_id into v_listing_id
  from public.booking_requests
  where id = p_request_id;
  if v_listing_id is null then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;

  select owner_id, is_demo, available_from, available_until
    into v_owner, v_demo, v_from, v_until
  from public.listings
  where id = v_listing_id
  for update;

  select status, starts_on, ends_on
    into v_status, v_start, v_end
  from public.booking_requests
  where id = p_request_id
  for update;

  if v_owner is distinct from v_uid or v_demo then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  if v_status <> 'pending' then
    raise exception 'booking_terminal' using errcode = 'P0001';
  end if;
  if not public.listing_is_public(v_listing_id) then
    raise exception 'booking_not_requestable' using errcode = 'P0001';
  end if;
  if v_start < public.booking_detroit_today()
    or v_end < v_start
    or v_start < v_from
    or v_end > v_until
  then
    raise exception 'booking_invalid_dates' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.listing_blocked_dates as blocked
    where blocked.listing_id = v_listing_id
      and blocked.starts_on <= v_end
      and v_start <= blocked.ends_on
  ) or exists (
    select 1 from public.booking_requests as req
    where req.listing_id = v_listing_id
      and req.status = 'accepted'
      and req.id <> p_request_id
      and req.starts_on <= v_end
      and v_start <= req.ends_on
  ) then
    raise exception 'booking_conflict' using errcode = 'P0001';
  end if;

  perform pg_catalog.set_config('app.booking_transition', 'allowed', true);
  update public.booking_requests
  set status = 'accepted',
      decided_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = p_request_id;
  perform pg_catalog.set_config('app.booking_transition', '', true);
end;
$$;

create or replace function public.decline_booking(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_listing_id uuid;
  v_owner uuid;
  v_status text;
begin
  if v_uid is null or p_request_id is null then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  select listing_id into v_listing_id from public.booking_requests where id = p_request_id;
  if v_listing_id is null then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  select owner_id into v_owner from public.listings where id = v_listing_id for update;
  select status into v_status from public.booking_requests where id = p_request_id for update;
  if v_owner is distinct from v_uid then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  if v_status <> 'pending' then
    raise exception 'booking_terminal' using errcode = 'P0001';
  end if;
  perform pg_catalog.set_config('app.booking_transition', 'allowed', true);
  update public.booking_requests
  set status = 'declined',
      decided_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = p_request_id;
  perform pg_catalog.set_config('app.booking_transition', '', true);
end;
$$;

create or replace function public.cancel_booking(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_renter uuid;
  v_status text;
begin
  if v_uid is null or p_request_id is null then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  select renter_id, status into v_renter, v_status
  from public.booking_requests
  where id = p_request_id
  for update;
  if v_renter is null or v_renter is distinct from v_uid then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  if v_status <> 'pending' then
    raise exception 'booking_terminal' using errcode = 'P0001';
  end if;
  perform pg_catalog.set_config('app.booking_transition', 'allowed', true);
  update public.booking_requests
  set status = 'cancelled',
      decided_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = p_request_id;
  perform pg_catalog.set_config('app.booking_transition', '', true);
end;
$$;

create or replace function public.listing_reserved_spans(target uuid)
returns table (starts_on date, ends_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select req.starts_on, req.ends_on
  from public.booking_requests as req
  where req.listing_id = target
    and req.status = 'accepted'
    and public.listing_is_public(target)
  order by req.starts_on;
$$;

create or replace function public.booking_counterparty_name(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when req.renter_id = auth.uid() then nullif(btrim(listing.sample_host_label), '')
    when listing.owner_id = auth.uid() then coalesce(renter_profile.display_name, 'Renter')
    else null
  end
  from public.booking_requests as req
  join public.listings as listing on listing.id = req.listing_id
  left join public.profiles as renter_profile on renter_profile.id = req.renter_id
  where req.id = target
    and (req.renter_id = auth.uid() or listing.owner_id = auth.uid());
$$;

revoke all on function public.booking_requests_guard() from public, anon, authenticated;
revoke all on function public.booking_detroit_today() from public, anon, authenticated;
revoke all on function public.listings_keep_accepted_window() from public, anon;
revoke all on function public.listing_blocked_dates_keep_accepted() from public, anon;
revoke all on function public.request_booking(uuid, date, date) from public, anon;
revoke all on function public.accept_booking(uuid) from public, anon;
revoke all on function public.decline_booking(uuid) from public, anon;
revoke all on function public.cancel_booking(uuid) from public, anon;
revoke all on function public.listing_reserved_spans(uuid) from public;
revoke all on function public.booking_counterparty_name(uuid) from public, anon;

grant execute on function public.listings_keep_accepted_window() to authenticated;
grant execute on function public.listing_blocked_dates_keep_accepted() to authenticated;
grant execute on function public.request_booking(uuid, date, date) to authenticated;
grant execute on function public.accept_booking(uuid) to authenticated;
grant execute on function public.decline_booking(uuid) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.listing_reserved_spans(uuid) to anon, authenticated;
grant execute on function public.booking_counterparty_name(uuid) to authenticated;

alter table public.booking_requests enable row level security;
revoke all on public.booking_requests from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    execute 'revoke insert, update, delete, truncate on table public.booking_requests from service_role';
  end if;
end $$;
grant select (
  id, listing_id, renter_id, starts_on, ends_on, status,
  price_cents, price_unit, created_at, updated_at, decided_at
) on public.booking_requests to authenticated;

drop policy if exists booking_requests_select_party on public.booking_requests;
create policy booking_requests_select_party
  on public.booking_requests
  for select
  to authenticated
  using (
    renter_id = (select auth.uid())
    or public.listing_owned(listing_id)
  );
