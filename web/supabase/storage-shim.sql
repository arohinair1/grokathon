-- Test-only stand-in for Supabase Storage. Do not apply this to the hosted project.
-- It creates the tables and foldername() helper the storage policies expect.
-- It does not enforce the Storage API owner column, MIME allow-list, or 5 MB limit.
\set ON_ERROR_STOP on

create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id),
  name text not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (bucket_id, name)
);

create or replace function storage.foldername(object_name text)
returns text[]
language sql
immutable
as $$
  select case
    when object_name is null or position('/' in object_name) = 0 then array[]::text[]
    else (string_to_array(object_name, '/'))[1:array_length(string_to_array(object_name, '/'), 1) - 1]
  end
$$;

alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;

grant usage on schema storage to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;
grant execute on function storage.foldername(text) to anon, authenticated;
