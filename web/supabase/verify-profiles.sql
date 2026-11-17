-- Run as a superuser after auth-shim.sql and 20261014040000_profiles.sql.
-- The shim is test-only. This script is not a migration.
\set ON_ERROR_STOP on

do $$
declare
  r text;
  p text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach p in array array['INSERT', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if has_table_privilege(r, 'public.profiles', p) then
        raise exception '% has % on profiles', r, p;
      end if;
    end loop;
    if has_column_privilege(r, 'public.profiles', 'id', 'UPDATE') then
      raise exception '% can update profiles.id', r;
    end if;
    if has_column_privilege(r, 'public.profiles', 'created_at', 'UPDATE') then
      raise exception '% can update profiles.created_at', r;
    end if;
  end loop;
  if has_table_privilege('anon', 'public.profiles', 'SELECT') then
    raise exception 'anon can select profiles';
  end if;
  if not has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE') then
    raise exception 'owner cannot update display_name';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd in ('INSERT', 'DELETE', 'ALL')
  ) then
    raise exception 'profiles has an insert or delete policy';
  end if;
  if has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE') then
    raise exception 'authenticated can execute handle_new_user';
  end if;
  if has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE') then
    raise exception 'anon can execute handle_new_user';
  end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@example.test', '{"display_name":"  Ada  "}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@example.test', null),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@example.test', '{"display_name":"   "}'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd@example.test', jsonb_build_object('display_name', repeat('n', 200)));

do $$
begin
  if (select display_name from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'Ada' then
    raise exception 'trimmed display name was not stored';
  end if;
  if (select display_name from public.profiles where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 'Member' then
    raise exception 'missing name did not become Member';
  end if;
  if (select display_name from public.profiles where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 'Member' then
    raise exception 'blank name did not become Member';
  end if;
  if (select char_length(display_name) from public.profiles where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') <> 80 then
    raise exception 'long name was not cut to 80 characters';
  end if;
end $$;

-- A second insert for the same user must not raise or duplicate the profile.
insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'e@example.test', '{"display_name":"Eve"}');
insert into public.profiles (id, display_name)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Eve')
on conflict (id) do nothing;

set role anon;
do $$
begin
  begin
    perform count(*) from public.profiles;
    raise exception 'anon read was allowed';
  exception
    when insufficient_privilege then null;
  end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', false);

do $$
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'user A can see a profile that is not theirs';
  end if;
  if (select id::text from public.profiles) <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then
    raise exception 'user A cannot see their own profile';
  end if;
  update public.profiles set display_name = 'Ada Lovelace' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if (select display_name from public.profiles) <> 'Ada Lovelace' then
    raise exception 'user A could not update their display name';
  end if;
  update public.profiles set display_name = 'stolen' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  begin
    insert into public.profiles (id, display_name)
    values ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'nope');
    raise exception 'authenticated insert was allowed';
  exception
    when insufficient_privilege then null;
  end;
  begin
    delete from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'authenticated delete was allowed';
  exception
    when insufficient_privilege then null;
  end;
  begin
    execute 'truncate public.profiles';
    raise exception 'authenticated truncate was allowed';
  exception
    when insufficient_privilege then null;
  end;
  begin
    update public.profiles set id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'authenticated id update was allowed';
  exception
    when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$
begin
  if (select display_name from public.profiles where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 'Member' then
    raise exception 'user A changed user B';
  end if;
  if (select display_name from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'Ada Lovelace' then
    raise exception 'user A display name did not stick';
  end if;
end $$;

-- The before-update trigger keeps id and created_at even for the table owner.
do $$
declare
  old_created timestamptz;
begin
  select created_at into old_created from public.profiles
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  update public.profiles
  set id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      created_at = old_created - interval '1 day',
      display_name = 'Still Ada'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if (select id::text from public.profiles where display_name = 'Still Ada')
      <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then
    raise exception 'profile id changed';
  end if;
  if (select created_at from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> old_created then
    raise exception 'profile created_at changed';
  end if;
end $$;
