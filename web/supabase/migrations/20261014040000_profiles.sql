-- One profile per auth user. This file does not define auth.uid(); hosted
-- Supabase already provides it. A local check uses web/supabase/auth-shim.sql
-- first, and that shim is not part of the hosted migration.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on public.profiles from public, anon, authenticated;
grant select (id, display_name, created_at, updated_at) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80)), ''),
      'Member'
    )
  )
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.updated_at := pg_catalog.now();
  return new;
end
$$;

drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.profiles_before_update() from public, anon, authenticated;

insert into public.profiles (id, display_name)
select id, 'Member'
from auth.users
on conflict (id) do nothing;
