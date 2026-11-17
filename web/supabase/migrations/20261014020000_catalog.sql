-- Read-only public catalog. No host contact fields and no street addresses.
-- Anonymous clients may select published rows only.

do $$ begin
  create role anon nologin;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_category as enum (
    'monthly-parking',
    'event-parking',
    'storage',
    'university-event'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.price_unit as enum ('day', 'month', 'semester', 'event');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_status as enum ('draft', 'published');
exception when duplicate_object then null;
end $$;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  description text not null,
  category public.listing_category not null,
  space_type text not null,
  neighborhood text not null,
  city text not null,
  state text not null,
  price_cents integer not null check (price_cents >= 0),
  price_unit public.price_unit not null,
  capacity_label text not null,
  available_from date not null,
  available_until date not null,
  constraint listings_available_window check (available_until >= available_from),
  featured boolean not null default false,
  is_demo boolean not null default true,
  status public.listing_status not null default 'draft',
  sample_host_label text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  path text not null,
  alt text not null,
  sort_order integer not null check (sort_order >= 0),
  is_primary boolean not null default false,
  unique (listing_id, sort_order)
);

create index if not exists listings_published_search_idx
  on public.listings (status, category, neighborhood, sort_order);

create index if not exists listing_photos_order_idx
  on public.listing_photos (listing_id, sort_order);

alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;

revoke all on public.listings from public;
revoke all on public.listing_photos from public;
revoke all on public.listings from anon, authenticated;
revoke all on public.listing_photos from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.listings to anon, authenticated;
grant select on public.listing_photos to anon, authenticated;

drop policy if exists listings_select_published on public.listings;
create policy listings_select_published
  on public.listings
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists listing_photos_select_published on public.listing_photos;
create policy listing_photos_select_published
  on public.listing_photos
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.listings
      where listings.id = listing_photos.listing_id
        and listings.status = 'published'
    )
  );
