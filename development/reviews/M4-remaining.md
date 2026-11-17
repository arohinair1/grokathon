# Milestone 4 remaining checks

Milestone 4 is not accepted.

## Hosted, reported by the founder

The founder applied `web/supabase/migrations/20261016050000_host_markets.sql` and `web/supabase/storage-listing-photos.sql`. Hosted checks showed one active college, eight published demo listings, one hidden draft, the private `listing-photos` bucket, and no client select or update of `listings.owner_id`.

On the Milestone 4 preview, an authenticated session created the draft `Test Driveway Parking — Ann Arbor`, saw it on `/host`, and did not see it in public search.

This pass did not repeat those checks and did not change the eight demo listings or the original hidden draft.

## Copy

The footer said accounts, hosting tools, and booking requests were not open. Hosting tools are open. The footer, the search page, and the “how it works” step now say accounts and hosting are available, and that bookings and payments are not. Demo cards stay labeled as samples. That copy is on `cursor/milestone-4-host-listings-aeea` at `6159542` and on the Milestone 5 branch.

## Local and automated

`verify-host.sql` and `verify-storage.sql` passed on a local database before the founder applied the hosted files. They use a local storage stand-in. They do not call the hosted Storage HTTP API.

## Pending on the hosted preview

Use a test account. Do not publish over the demo listings. If a test listing is published, unpublish it before finishing.

1. Open the draft `Test Driveway Parking — Ann Arbor` and save a description, price, dates, and the Ann Arbor college.
2. Upload one JPEG, one PNG, or one WebP under 5 MB. Confirm it appears on the editor after refresh.
3. Delete that photo, or replace it, and confirm the object is gone from the editor.
4. Block a date range and remove it.
5. Try to publish with a required field missing and confirm the draft stays private.
6. Publish only if the listing is complete and a cleanup is ready. Confirm it appears in public search, then unpublish it and confirm it disappears.
7. With a second account, confirm that account cannot open the first account’s editor or private address.

Storage upload, blocked dates, publish, unpublish, and cross-user listing access are not hosted-verified.
