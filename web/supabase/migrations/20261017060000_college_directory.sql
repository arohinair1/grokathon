-- College directory search and a stable external institution id.
-- Prepared for approval. Do not apply this to hosted Supabase until the
-- founder accepts the import plan. Existing market_status values are untouched.
-- University of Michigan–Ann Arbor stays the only active college in the seed.

alter table public.colleges
  add column if not exists source text,
  add column if not exists source_id text;

alter table public.colleges
  drop constraint if exists colleges_source_check;

alter table public.colleges
  add constraint colleges_source_check
  check (source is null or source in ('ipeds'));

alter table public.colleges
  drop constraint if exists colleges_source_id_check;

alter table public.colleges
  add constraint colleges_source_id_check
  check (source_id is null or source_id ~ '^[0-9]{4,8}$');

create unique index if not exists colleges_source_identity_idx
  on public.colleges (source, source_id)
  where source is not null and source_id is not null;

create table if not exists public.college_aliases (
  college_id uuid not null references public.colleges (id) on delete cascade,
  alias text not null check (char_length(btrim(alias)) between 2 and 160),
  primary key (college_id, alias)
);

create index if not exists college_aliases_lower_idx
  on public.college_aliases (lower(alias));

alter table public.college_aliases enable row level security;
revoke all on table public.college_aliases from public, anon, authenticated;
grant select on table public.college_aliases to anon, authenticated;

drop policy if exists college_aliases_read on public.college_aliases;
create policy college_aliases_read
  on public.college_aliases
  for select
  to anon, authenticated
  using (true);

create or replace function public.search_colleges(term text, result_limit integer default 8)
returns table (
  id uuid,
  slug text,
  name text,
  city text,
  state_code char(2),
  state_name text,
  market_status text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with cleaned as (
    select left(btrim(regexp_replace(coalesce(term, ''), '[%_\\]', ' ', 'g')), 80) as q
  )
  select c.id, c.slug, c.name, c.city, c.state_code, s.name, c.market_status
  from cleaned
  join public.colleges c
    on char_length(cleaned.q) >= 2
   and (
     c.name ilike '%' || cleaned.q || '%'
     or exists (
       select 1
       from public.college_aliases a
       where a.college_id = c.id
         and a.alias ilike '%' || cleaned.q || '%'
     )
   )
  join public.states s on s.code = c.state_code
  order by (c.market_status = 'active') desc, c.name
  limit least(greatest(coalesce(result_limit, 8), 1), 24);
$$;

create or replace function public.directory_states()
returns table (
  code char(2),
  name text,
  college_count bigint,
  active_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.code, s.name,
    count(c.id)::bigint,
    count(c.id) filter (where c.market_status = 'active')::bigint
  from public.states s
  join public.colleges c on c.state_code = s.code
  group by s.code, s.name
  order by s.name;
$$;

revoke all on function public.search_colleges(text, integer) from public;
revoke all on function public.directory_states() from public;
grant execute on function public.search_colleges(text, integer) to anon, authenticated;
grant execute on function public.directory_states() to anon, authenticated;
