// Local concurrency check for accepted reservations.
// Uses a socket database created for this run. Refuses any other target.
// Do not point this at hosted Supabase.

import { spawn } from "node:child_process"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const database = "m6_concurrency"
const listingId = "b1000000-0000-4000-8000-000000000001"
const requestA = "c1000000-0000-4000-8000-00000000000a"
const requestB = "c1000000-0000-4000-8000-00000000000b"

function psql(db, sql) {
  return new Promise((resolve) => {
    const child = spawn("sudo", ["-u", "postgres", "psql", "-d", db, "-v", "ON_ERROR_STOP=1", "-c", sql], {
      stdio: ["ignore", "pipe", "pipe"],
    })
    let out = ""
    let err = ""
    child.stdout.on("data", (chunk) => {
      out += chunk
    })
    child.stderr.on("data", (chunk) => {
      err += chunk
    })
    child.on("close", (code) => resolve({ code: code ?? 1, out, err }))
  })
}

function psqlStdin(db, sql) {
  return new Promise((resolve) => {
    const child = spawn("sudo", ["-u", "postgres", "psql", "-d", db, "-v", "ON_ERROR_STOP=1"], {
      stdio: ["pipe", "pipe", "pipe"],
    })
    let out = ""
    let err = ""
    child.stdout.on("data", (chunk) => {
      out += chunk
    })
    child.stderr.on("data", (chunk) => {
      err += chunk
    })
    child.on("close", (code) => resolve({ code: code ?? 1, out, err }))
    child.stdin.end(sql)
  })
}

function psqlFile(db, file) {
  return new Promise((resolve) => {
    const child = spawn("sudo", ["-u", "postgres", "psql", "-d", db, "-v", "ON_ERROR_STOP=1", "-f", file], {
      stdio: ["ignore", "pipe", "pipe"],
    })
    let out = ""
    let err = ""
    child.stdout.on("data", (chunk) => {
      out += chunk
    })
    child.stderr.on("data", (chunk) => {
      err += chunk
    })
    child.on("close", (code) => resolve({ code: code ?? 1, out, err }))
  })
}

const files = [
  "supabase/auth-shim.sql",
  "supabase/migrations/20261014020000_catalog.sql",
  "supabase/seed.sql",
  "supabase/migrations/20261014040000_profiles.sql",
  "supabase/migrations/20261016050000_host_markets.sql",
  "supabase/migrations/20261018070000_booking_requests.sql",
]

const fixture = `
begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'host-a@example.test', '{"display_name":"Host A"}'),
  ('33333333-3333-4333-8333-333333333333', 'renter-a@example.test', '{"display_name":"Renter A"}'),
  ('44444444-4444-4444-8444-444444444444', 'renter-b@example.test', '{"display_name":"Renter B"}');

insert into public.listings (
  id, owner_id, slug, title, summary, description, category, space_type, neighborhood, city, state,
  price_cents, price_unit, capacity_label, available_from, available_until, dates_confirmed,
  featured, is_demo, status, sample_host_label, sort_order
) values (
  '${listingId}',
  '11111111-1111-4111-8111-111111111111',
  'host-a-bookable',
  'Bookable driveway',
  'A paved driveway near campus.',
  'The driveway is paved and empty on weekdays during the term.',
  'monthly-parking', 'Driveway', 'Burns Park', 'Ann Arbor', 'MI',
  4000, 'day', 'One car', '2027-01-01', '2027-12-31', true, false, false, 'published', 'Host A', 500
);
insert into public.listing_photos (listing_id, path, alt, sort_order, is_primary) values
  ('${listingId}', '${listingId}/cover.jpg', 'Driveway', 0, true);
insert into public.listing_private (listing_id, address_line) values ('${listingId}', '1 Test Street');
insert into public.listing_colleges (listing_id, college_id, is_primary) values
  ('${listingId}', 'a0000000-0000-4000-8000-000000000001', true);

select set_config('app.booking_transition', 'allowed', true);
insert into public.booking_requests (
  id, listing_id, renter_id, starts_on, ends_on, status, price_cents, price_unit
) values
  ('${requestA}', '${listingId}', '33333333-3333-4333-8333-333333333333', '2027-06-01', '2027-06-05', 'pending', 4000, 'day'),
  ('${requestB}', '${listingId}', '44444444-4444-4444-8444-444444444444', '2027-06-04', '2027-06-08', 'pending', 4000, 'day');
select set_config('app.booking_transition', '', true);
commit;
`

const accept = (id) => `
begin;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select public.accept_booking('${id}');
select pg_sleep(2);
commit;
`

await psql("postgres", `drop database if exists ${database}`)
const created = await psql("postgres", `create database ${database}`)
if (created.code !== 0) {
  console.error(created.err)
  process.exit(1)
}

for (const file of files) {
  const applied = await psqlFile(database, join(root, file))
  if (applied.code !== 0) {
    console.error(file, applied.err)
    process.exit(1)
  }
}

const loaded = await psqlStdin(database, fixture)
if (loaded.code !== 0) {
  console.error(loaded.err)
  process.exit(1)
}

const first = psql(database, accept(requestA))
await new Promise((resolve) => setTimeout(resolve, 400))
const second = await psql(database, accept(requestB).replace("select pg_sleep(2);\n", ""))
const firstResult = await first
const accepted = await psql(
  database,
  `select id::text from public.booking_requests where status = 'accepted' order by id`,
)
await psql("postgres", `drop database if exists ${database}`)

const firstOk = firstResult.code === 0
const secondOk = second.code === 0
const rows = accepted.out
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.startsWith("c100"))

if (firstOk === secondOk || rows.length !== 1) {
  console.error(
    JSON.stringify(
      {
        firstOk,
        secondOk,
        firstErr: firstResult.err,
        secondErr: second.err,
        accepted: accepted.out,
      },
      null,
      2,
    ),
  )
  process.exit(1)
}

console.log(
  JSON.stringify({
    ok: true,
    accepted: rows,
    loser: firstOk ? "second" : "first",
    loserError: (firstOk ? second.err : firstResult.err).trim(),
  }),
)
