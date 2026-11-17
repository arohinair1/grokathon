# Milestone 4 security review

Date: 2026-10-16

Independent review of the Milestone 4 SQL before hosted apply. Verdict: **approve the two SQL files for the founder to run**. This is not acceptance of Milestone 4. The files have not been applied to the hosted project, and the branch is not merged.

Reviewed files:

- `web/supabase/migrations/20261016050000_host_markets.sql`
- `web/supabase/storage-listing-photos.sql`
- `web/lib/host/actions.ts`
- `web/lib/host/load.ts`

## Blocking issues

None.

## Closed in this pass

1. Storage `UPDATE` now has both `USING` and `WITH CHECK`. Both require the `listing-photos` bucket, a valid `{listing_id}/{file}` path, and `listing_is_host_owned`. A trigger rejects bucket changes and renames, including a move into another listing the same host owns.
2. Anonymous storage reads require a publicly visible listing and a `listing_photos` row whose path is the object name. Draft objects are readable only by the authenticated owner. A second policy, not the anonymous role, carries the owner check.
3. After the storage file is applied, publishing a non-demo listing requires a real object for every host photo row. The app checks the bucket before it publishes. Deleting the last photo row, or the last stored object, of a published listing is rejected. The app deletes the database row first and removes the storage object only when that delete returns a row.
4. The hosted migration seeds only University of Michigan–Ann Arbor. The two planned fixture colleges are inserted inside `verify-host.sql` and rolled back.
5. Authenticated clients can insert `owner_id` and cannot select or update it. Dashboard and editor queries use `host_listing_ids()` and `listing_is_host_owned(target)`. See DEC-007.
6. The migration is additive. A fresh local apply left eight published demo listings, the hidden draft, and nine `/images/` photo rows.

Local proof, on throwaway database `m4_host_check`, after the catalog migration, seed, auth shim, profile migration, and host migration:

- `verify-host.sql` rolled back successfully, including two-user isolation, draft privacy, private addresses, publish rules, photo paths, and `owner_id` privileges.
- `verify-rls.sql` passed, including no `SELECT` or `UPDATE` on `owner_id` for `authenticated`.
- `storage-shim.sql` plus `storage-listing-photos.sql`, then `verify-storage.sql`, rolled back successfully. That script is a policy simulation. It does not call the Storage HTTP API.

`verify-host.sql` was run again after the storage file and still passed. The seeded database then still had one draft, eight published listings, nine static photos, and one active college.

## Nonblocking

- `loadDashboard()` shows an empty list when `host_listing_ids()` fails for a reason other than a missing schema. That is not an authorization bypass.
- The app treats an `/images/` path as already stored. A host listing cannot save that path: `limit_listing_photos` allows it only for demo rows.
- Applying only the migration leaves the stored-photo trigger uncreated. Run `storage-listing-photos.sql` immediately after the migration, before a host publishes. Inserting a listing as `published` is already rejected.
- The local storage shim does not enforce the Storage API owner column, the MIME allow-list, or the 5 MB limit. Supabase Storage enforces those when the real file is applied.

## Not verified here

- The hosted Supabase project. Do not apply either file until the founder runs them.
- A real photo upload against hosted Storage.
- Password-recovery email. That remains a Milestone 3 mailer limit.
