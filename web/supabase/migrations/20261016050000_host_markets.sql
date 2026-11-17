-- Host ownership, college markets, and blocked dates.
-- Additive. Existing demo rows keep owner_id null and stay publicly readable.
-- Do not apply this file to the hosted project without approval.
-- Apply this file before web/supabase/storage-listing-photos.sql.
-- Authenticated clients can insert owner_id and cannot select it.

create table if not exists public.states (
  code char(2) primary key,
  name text not null unique
);

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  state_code char(2) not null references public.states (code),
  city text not null,
  market_status text not null check (market_status in ('planned', 'active', 'paused')),
  created_at timestamptz not null default now()
);

create index if not exists colleges_state_status_idx
  on public.colleges (state_code, market_status);

create index if not exists colleges_name_idx
  on public.colleges (name);

alter table public.listings
  add column if not exists owner_id uuid references auth.users (id) on delete cascade,
  add column if not exists dates_confirmed boolean not null default false,
  add column if not exists amenities text not null default '',
  add column if not exists restrictions text not null default '';

alter table public.listings
  drop constraint if exists listings_amenities_length,
  drop constraint if exists listings_restrictions_length;

alter table public.listings
  add constraint listings_amenities_length check (char_length(amenities) <= 500),
  add constraint listings_restrictions_length check (char_length(restrictions) <= 500);

update public.listings set dates_confirmed = true where is_demo and dates_confirmed = false;

create index if not exists listings_owner_idx on public.listings (owner_id);

create table if not exists public.listing_private (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  address_line text not null default '',
  access_notes text not null default '',
  constraint listing_private_address_length check (char_length(address_line) <= 200),
  constraint listing_private_notes_length check (char_length(access_notes) <= 1000)
);

create table if not exists public.listing_colleges (
  listing_id uuid not null references public.listings (id) on delete cascade,
  college_id uuid not null references public.colleges (id),
  is_primary boolean not null default false,
  primary key (listing_id, college_id)
);

create unique index if not exists listing_colleges_one_primary
  on public.listing_colleges (listing_id)
  where is_primary;

create index if not exists listing_colleges_college_idx
  on public.listing_colleges (college_id);

create table if not exists public.listing_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  constraint listing_blocked_dates_order check (ends_on >= starts_on),
  unique (listing_id, starts_on, ends_on)
);

create index if not exists listing_blocked_dates_span_idx
  on public.listing_blocked_dates (listing_id, starts_on, ends_on);

create or replace function public.listings_keep_owner()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.owner_id := old.owner_id;
    new.is_demo := old.is_demo;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_keep_owner on public.listings;
create trigger listings_keep_owner
  before update on public.listings
  for each row execute function public.listings_keep_owner();

create or replace function public.limit_listing_photos()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.listing_photos
    where listing_id = new.listing_id
  ) >= 8 then
    raise exception 'listing photo limit' using errcode = 'check_violation';
  end if;
  if new.path like '%..%' or char_length(new.path) > 240 then
    raise exception 'listing photo path' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.listings
    where id = new.listing_id and is_demo
  ) then
    if new.path not like '/images/%' then
      raise exception 'listing photo path' using errcode = 'check_violation';
    end if;
  elsif new.path !~ ('^' || new.listing_id::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'listing photo path' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists listing_photos_limit on public.listing_photos;
create trigger listing_photos_limit
  before insert on public.listing_photos
  for each row execute function public.limit_listing_photos();

create or replace function public.listings_require_publishable()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.is_demo = false then
    if char_length(new.summary) < 20
      or char_length(new.description) < 40
      or char_length(btrim(new.space_type)) < 1
      or char_length(btrim(new.neighborhood)) < 1
      or char_length(btrim(new.city)) < 1
      or char_length(new.state) <> 2
      or char_length(btrim(new.capacity_label)) < 1
      or new.price_cents <= 0
      or new.dates_confirmed = false
      or not exists (
        select 1 from public.listing_photos where listing_id = new.id
      )
      or not exists (
        select 1 from public.listing_private
        where listing_id = new.id and char_length(btrim(address_line)) > 0
      )
      or not exists (
        select 1
        from public.listing_colleges as link
        join public.colleges as college on college.id = link.college_id
        where link.listing_id = new.id
          and link.is_primary
          and college.market_status = 'active'
      )
    then
      raise exception 'listing is not publishable' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_require_publishable on public.listings;
create trigger listings_require_publishable
  before update on public.listings
  for each row execute function public.listings_require_publishable();

create or replace function public.listing_photos_keep_cover()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.listings
    where id = old.listing_id
      and status = 'published'
      and is_demo = false
    for update
  ) and not exists (
    select 1 from public.listing_photos
    where listing_id = old.listing_id
      and id <> old.id
  ) then
    raise exception 'published listing needs a photo' using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

drop trigger if exists listing_photos_keep_cover on public.listing_photos;
create trigger listing_photos_keep_cover
  before delete on public.listing_photos
  for each row execute function public.listing_photos_keep_cover();

revoke all on function public.listings_keep_owner() from public, anon;
revoke all on function public.limit_listing_photos() from public, anon;
grant execute on function public.listings_keep_owner() to authenticated;
grant execute on function public.limit_listing_photos() to authenticated;
grant execute on function public.listings_require_publishable() to authenticated;
grant execute on function public.listing_photos_keep_cover() to authenticated;
revoke all on function public.listings_require_publishable() from public, anon;
revoke all on function public.listing_photos_keep_cover() from public, anon;

alter table public.states enable row level security;
alter table public.colleges enable row level security;
alter table public.listing_private enable row level security;
alter table public.listing_colleges enable row level security;
alter table public.listing_blocked_dates enable row level security;

revoke all on public.states from public, anon, authenticated;
revoke all on public.colleges from public, anon, authenticated;
revoke all on public.listing_private from public, anon, authenticated;
revoke all on public.listing_colleges from public, anon, authenticated;
revoke all on public.listing_blocked_dates from public, anon, authenticated;
revoke all on public.listings from anon, authenticated;
revoke all on public.listing_photos from anon, authenticated;

grant select on public.states to anon, authenticated;
grant select on public.colleges to anon, authenticated;

grant select (
  id, slug, title, summary, description, category, space_type, neighborhood, city, state,
  price_cents, price_unit, capacity_label, available_from, available_until, featured, is_demo,
  status, sample_host_label, sort_order, created_at, updated_at, amenities, restrictions, dates_confirmed
) on public.listings to anon, authenticated;

grant insert (
  owner_id, slug, title, summary, description, category, space_type, neighborhood, city, state,
  price_cents, price_unit, capacity_label, available_from, available_until, featured, is_demo,
  status, sample_host_label, sort_order, amenities, restrictions, dates_confirmed
) on public.listings to authenticated;

grant update (
  slug, title, summary, description, category, space_type, neighborhood, city, state,
  price_cents, price_unit, capacity_label, available_from, available_until,
  status, sample_host_label, amenities, restrictions, dates_confirmed, updated_at
) on public.listings to authenticated;

grant delete on public.listings to authenticated;

grant select on public.listing_photos to anon, authenticated;
grant insert (listing_id, path, alt, sort_order, is_primary) on public.listing_photos to authenticated;
grant update (alt, sort_order, is_primary) on public.listing_photos to authenticated;
grant delete on public.listing_photos to authenticated;

grant select, insert, update on public.listing_private to authenticated;
grant select on public.listing_colleges to anon, authenticated;
grant insert, update, delete on public.listing_colleges to authenticated;
grant select on public.listing_blocked_dates to anon, authenticated;
grant insert, delete on public.listing_blocked_dates to authenticated;

create or replace function public.listing_is_public(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings as listing
    where listing.id = target
      and listing.status = 'published'
      and (
        listing.is_demo
        or exists (
          select 1
          from public.listing_colleges as link
          join public.colleges as college on college.id = link.college_id
          where link.listing_id = listing.id
            and link.is_primary
            and college.market_status = 'active'
        )
      )
  );
$$;

create or replace function public.listing_owned(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings as listing
    where listing.id = target
      and listing.owner_id = auth.uid()
  );
$$;

create or replace function public.listing_is_host_owned(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings as listing
    where listing.id = target
      and listing.owner_id = auth.uid()
      and listing.is_demo = false
  );
$$;

create or replace function public.host_listing_ids()
returns table (listing_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select listing.id
  from public.listings as listing
  where listing.owner_id = auth.uid()
    and listing.is_demo = false;
$$;

revoke all on function public.listing_is_public(uuid) from public;
revoke all on function public.listing_owned(uuid) from public;
revoke all on function public.listing_is_host_owned(uuid) from public;
revoke all on function public.host_listing_ids() from public, anon;
grant execute on function public.listing_is_public(uuid) to anon, authenticated;
grant execute on function public.listing_owned(uuid) to authenticated;
grant execute on function public.listing_is_host_owned(uuid) to authenticated;
grant execute on function public.host_listing_ids() to authenticated;

drop policy if exists states_read on public.states;
create policy states_read on public.states for select to anon, authenticated using (true);

drop policy if exists colleges_read on public.colleges;
create policy colleges_read on public.colleges for select to anon, authenticated using (true);

drop policy if exists listings_select_published on public.listings;
create policy listings_select_published
  on public.listings
  for select
  to anon, authenticated
  using (public.listing_is_public(id));

drop policy if exists listings_select_own on public.listings;
create policy listings_select_own
  on public.listings
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists listings_insert_own on public.listings;
create policy listings_insert_own
  on public.listings
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and is_demo = false
    and status = 'draft'
  );

drop policy if exists listings_update_own on public.listings;
create policy listings_update_own
  on public.listings
  for update
  to authenticated
  using (owner_id = (select auth.uid()) and is_demo = false)
  with check (owner_id = (select auth.uid()) and is_demo = false);

drop policy if exists listings_delete_own on public.listings;
create policy listings_delete_own
  on public.listings
  for delete
  to authenticated
  using (owner_id = (select auth.uid()) and is_demo = false);

drop policy if exists listing_photos_select_published on public.listing_photos;
create policy listing_photos_select_published
  on public.listing_photos
  for select
  to anon, authenticated
  using (public.listing_is_public(listing_id));

drop policy if exists listing_photos_select_own on public.listing_photos;
create policy listing_photos_select_own
  on public.listing_photos
  for select
  to authenticated
  using (public.listing_owned(listing_id));

drop policy if exists listing_photos_insert_own on public.listing_photos;
create policy listing_photos_insert_own
  on public.listing_photos
  for insert
  to authenticated
  with check (public.listing_is_host_owned(listing_id));

drop policy if exists listing_photos_update_own on public.listing_photos;
create policy listing_photos_update_own
  on public.listing_photos
  for update
  to authenticated
  using (public.listing_is_host_owned(listing_id))
  with check (public.listing_is_host_owned(listing_id));

drop policy if exists listing_photos_delete_own on public.listing_photos;
create policy listing_photos_delete_own
  on public.listing_photos
  for delete
  to authenticated
  using (public.listing_is_host_owned(listing_id));

drop policy if exists listing_private_own on public.listing_private;
create policy listing_private_own
  on public.listing_private
  for all
  to authenticated
  using (public.listing_owned(listing_id))
  with check (public.listing_owned(listing_id));

drop policy if exists listing_colleges_select_public on public.listing_colleges;
create policy listing_colleges_select_public
  on public.listing_colleges
  for select
  to anon, authenticated
  using (public.listing_is_public(listing_id));

drop policy if exists listing_colleges_write_own on public.listing_colleges;
create policy listing_colleges_write_own
  on public.listing_colleges
  for all
  to authenticated
  using (public.listing_owned(listing_id))
  with check (public.listing_is_host_owned(listing_id));

drop policy if exists listing_blocked_select_public on public.listing_blocked_dates;
create policy listing_blocked_select_public
  on public.listing_blocked_dates
  for select
  to anon, authenticated
  using (public.listing_is_public(listing_id));

drop policy if exists listing_blocked_select_own on public.listing_blocked_dates;
create policy listing_blocked_select_own
  on public.listing_blocked_dates
  for select
  to authenticated
  using (public.listing_owned(listing_id));

drop policy if exists listing_blocked_insert_own on public.listing_blocked_dates;
create policy listing_blocked_insert_own
  on public.listing_blocked_dates
  for insert
  to authenticated
  with check (public.listing_is_host_owned(listing_id));

drop policy if exists listing_blocked_delete_own on public.listing_blocked_dates;
create policy listing_blocked_delete_own
  on public.listing_blocked_dates
  for delete
  to authenticated
  using (public.listing_is_host_owned(listing_id));

insert into public.states (code, name) values
  ('AL', 'Alabama'), ('AK', 'Alaska'), ('AZ', 'Arizona'), ('AR', 'Arkansas'),
  ('CA', 'California'), ('CO', 'Colorado'), ('CT', 'Connecticut'), ('DE', 'Delaware'),
  ('DC', 'District of Columbia'), ('FL', 'Florida'), ('GA', 'Georgia'), ('HI', 'Hawaii'),
  ('ID', 'Idaho'), ('IL', 'Illinois'), ('IN', 'Indiana'), ('IA', 'Iowa'),
  ('KS', 'Kansas'), ('KY', 'Kentucky'), ('LA', 'Louisiana'), ('ME', 'Maine'),
  ('MD', 'Maryland'), ('MA', 'Massachusetts'), ('MI', 'Michigan'), ('MN', 'Minnesota'),
  ('MS', 'Mississippi'), ('MO', 'Missouri'), ('MT', 'Montana'), ('NE', 'Nebraska'),
  ('NV', 'Nevada'), ('NH', 'New Hampshire'), ('NJ', 'New Jersey'), ('NM', 'New Mexico'),
  ('NY', 'New York'), ('NC', 'North Carolina'), ('ND', 'North Dakota'), ('OH', 'Ohio'),
  ('OK', 'Oklahoma'), ('OR', 'Oregon'), ('PA', 'Pennsylvania'), ('RI', 'Rhode Island'),
  ('SC', 'South Carolina'), ('SD', 'South Dakota'), ('TN', 'Tennessee'), ('TX', 'Texas'),
  ('UT', 'Utah'), ('VT', 'Vermont'), ('VA', 'Virginia'), ('WA', 'Washington'),
  ('WV', 'West Virginia'), ('WI', 'Wisconsin'), ('WY', 'Wyoming')
on conflict (code) do nothing;

insert into public.colleges (id, slug, name, state_code, city, market_status) values
  (
    'a0000000-0000-4000-8000-000000000001',
    'university-of-michigan-ann-arbor',
    'University of Michigan–Ann Arbor',
    'MI',
    'Ann Arbor',
    'active'
  )
on conflict (slug) do nothing;

insert into public.listing_colleges (listing_id, college_id, is_primary)
select l.id, 'a0000000-0000-4000-8000-000000000001', true
from public.listings l
where l.city = 'Ann Arbor'
  and l.state = 'MI'
  and not exists (
    select 1 from public.listing_colleges existing
    where existing.listing_id = l.id
      and existing.is_primary
  )
on conflict (listing_id, college_id) do nothing;
