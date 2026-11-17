# Catalog database

Milestone 2 schema. Apply `migrations/20261014020000_catalog.sql`, then `seed.sql`.
`verify-rls.sql` checks that anonymous reads see eight published listings and no
draft, and that `anon` has no write privilege.

Availability is one inclusive `available_from` / `available_until` pair per listing.
Later milestones can add blocked dates and booking conflicts. Those tables are not
created here.

Photos for the demo catalog are paths under `web/public/images`. Host uploads use a private Storage bucket described in `storage-listing-photos.sql`. That file is not applied automatically.

`migrations/20261016050000_host_markets.sql` adds listing owners, states, colleges, private addresses, college links, and blocked dates. Apply it locally after the profile migration. Do not apply it to the hosted project without approval. The hosted seed is only University of Michigan–Ann Arbor. `verify-host.sql` inserts two planned colleges inside a transaction and rolls them back; run it only on a local database.

Authenticated clients can insert `listings.owner_id` and cannot select it. A host loads their own rows with `host_listing_ids()` and `listing_is_host_owned(target)`.

When the founder approves the hosted change, run these two files in the Supabase SQL editor, in this order, and run nothing else from this directory:

1. `migrations/20261016050000_host_markets.sql`
2. `storage-listing-photos.sql`

Run the storage file immediately after the migration, before a host publishes. The migration itself does not read Storage. The storage file rejects a publish when a host photo row has no object in `listing-photos`, and it rejects moving or deleting the last stored photo of a published listing.

`migrations/20261017060000_college_directory.sql` adds an IPEDS source id, aliases, and two read-only search functions. It does not change `market_status`. Do not apply it to the hosted project until the import in `development/reviews/M5-directory.md` is approved. `verify-directory.sql` rolls back its fixtures. Run it only on a local database. The importer refuses a non-local database URL:

```bash
node --experimental-strip-types scripts/import-colleges.ts --csv /path/to/HD2024.csv --database postgresql://127.0.0.1/college_space --dry-run
```

`migrations/20261018070000_booking_requests.sql` adds `booking_requests` and the transition functions. It does not read the college-directory migration and does not change `market_status`. Apply it locally after the host migration. `migrations/20261018070100_listing_integrity.sql` keeps a published listing from losing its address or active college, caps blocked ranges at 48, and adds `listing_ids_blocked_between` so date search does not depend on a truncated block list. Do not apply either file to the hosted project until the founder approves DEC-009. `verify-bookings.sql` and `verify-integrity.sql` roll back. `node scripts/verify-booking-concurrency.mjs` creates and drops a local database named `m6_concurrency`.

Do not run `auth-shim.sql`, `storage-shim.sql`, `verify-host.sql`, `verify-rls.sql`, `verify-storage.sql`, `verify-directory.sql`, or `verify-bookings.sql` on the hosted project. `storage-shim.sql` is a local stand-in. It checks the SQL policies and triggers. It does not call the Storage HTTP API, and it does not enforce the Storage owner column, MIME allow-list, or 5 MB limit. Those are enforced by Supabase Storage when the real file is applied.

After both hosted files succeed, run:

```sql
select slug, market_status from public.colleges order by slug;
select status, count(*) from public.listings group by status order by status;
select count(*) as photos,
       count(*) filter (where path like '/images/%') as static_photos
from public.listing_photos;
select public.listing_is_public(id) as public, count(*)
from public.listings
group by 1
order by 1;
select has_column_privilege('authenticated', 'public.listings', 'owner_id', 'SELECT') as authenticated_can_read_owner,
       has_column_privilege('anon', 'public.listings', 'owner_id', 'SELECT') as anon_can_read_owner,
       has_column_privilege('authenticated', 'public.listings', 'owner_id', 'INSERT') as authenticated_can_insert_owner;
select id, public, file_size_limit from storage.buckets where id = 'listing-photos';
select policyname, cmd, qual is not null as has_using, with_check is not null as has_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

Expect one college, `university-of-michigan-ann-arbor`, with `active`. Expect eight published listings and one draft. Expect nine photo rows, all under `/images/`. Expect eight listings where `listing_is_public` is true. Expect `authenticated_can_read_owner` and `anon_can_read_owner` to be false, and `authenticated_can_insert_owner` to be true. Expect the `listing-photos` bucket to be private with a 5242880 byte limit. Expect `listing_photos_owner_update` to have both a USING expression and a WITH CHECK expression.
