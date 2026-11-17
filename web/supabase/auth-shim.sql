-- Test-only stand-in for Supabase Auth. Do not apply this to the hosted project.
\set ON_ERROR_STOP on

do $$ begin
  create role anon nologin noinherit;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role authenticated nologin noinherit;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role service_role nologin noinherit bypassrls;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role supabase_auth_admin nologin noinherit;
exception when duplicate_object then null;
end $$;

create schema if not exists auth authorization supabase_auth_admin;

create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  raw_user_meta_data jsonb,
  created_at timestamptz default now()
);

alter table auth.users owner to supabase_auth_admin;

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
