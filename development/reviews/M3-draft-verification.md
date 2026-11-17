# Hosted draft verification

Date: 2026-10-14. This is an operational check, not the independent review.

## What anon access shows

On the Milestone 2 preview, before the read-only health check deployed:

- `GET /catalog-health` returned `publishedCount: 8`, `photoCount: 8`, `draftVisible: false`, `writeDenied: true`.
- `GET /listings/hidden-sample-draft` returned HTTP 404.

Anonymous clients cannot read a published row with that slug. `draftVisible: false` also happens when the draft row was never inserted. This check does not prove the hosted draft exists.

## What local Postgres shows

`web/supabase/verify-rls.sql` passed on local database `college_space`. That script requires 8 published rows and 9 rows total, then switches to `anon` and checks that the draft is hidden and inserts are denied. The local draft row is present, and RLS is what hides it.

## Hosted row count still needs a privileged query

Run this in the Supabase SQL editor:

```sql
select status, count(*) from public.listings group by 1;
```

The expected result is one `draft` row and eight `published` rows. Then run `web/supabase/verify-rls.sql` there. No service-role key is available in this environment, so that count was not run against the hosted project.
