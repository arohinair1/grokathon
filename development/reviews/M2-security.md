# M2 security review: public catalog

Verdict: APPROVE WITH NONBLOCKING ISSUES

Reviewer: security reviewer (`.cursor/agents/security-reviewer.md`). I did not write this schema or code, and I did not edit application code.
Date: 2026-10-14.

## What was reviewed

- Uncommitted working-tree files on branch `cursor/milestone-2-catalog-aeea` (base `2784069`):
  `web/supabase/migrations/20261014020000_catalog.sql`, `web/supabase/seed.sql`, `web/supabase/verify-rls.sql`, `web/lib/supabase.ts`, `web/lib/repository.ts`, `web/.env.example`.
- For context only: `web/lib/repository.test.ts`, `web/proxy.ts`, the three callers of `repository.ts` (`web/app/search/page.tsx`, `web/app/listings/[id]/page.tsx`, `web/components/home/featured.tsx`), the `web/.gitignore` change, and the `package.json` / lockfile change.
- Standard applied: `docs/QUALITY_STANDARDS.md`, "Security, when the change touches it".

Not reviewed: a hosted Supabase project (none is configured, and there are no credentials). I approximated one as described under "How I tested". I also did not review a production build or Supabase Storage, which this milestone doesn't use.

## Required checks

| Check | Result |
|---|---|
| RLS enabled on both tables | Pass |
| Anon reads only published listings and their photos | Pass |
| Anon cannot insert, update, or delete | Pass |
| No service-role key in client code | Pass |
| No street address or host contact columns | Pass |
| `hidden-sample-draft` invisible to anon | Pass |

Evidence:

1. **RLS enabled.** In `college_space`, `pg_class.relrowsecurity` is `t` for both `public.listings` and `public.listing_photos`. RLS is not forced, which is fine: only the owner (`postgres`) bypasses it, and the owner isn't a client role.
2. **Published-only reads.** There are two policies, both `FOR SELECT TO anon, authenticated`. `listings_select_published` uses `status = 'published'`. `listing_photos_select_published` uses `EXISTS (... listings.status = 'published')`. The photo policy's subquery runs as the caller, so the listings policy also applies inside it. That is consistent, with no recursion risk. As `anon`, `college_space` returned 8 of 9 listings and 8 of 9 photos. `SELECT DISTINCT status` returned only `published`, and `COPY listings TO STDOUT` also returned only the 8 published rows.
3. **No writes.** Table grants for `anon` and `authenticated` are `SELECT` only: no INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, or TRIGGER. There are no column-level write grants, no functions or views in `public`, no triggers, no default ACLs, and neither role is a member of any other role. Every write I tried, as `anon` and as `authenticated`, was refused: INSERT of a `published` row, UPDATE, publishing the draft, DELETE, TRUNCATE, `SELECT ... FOR UPDATE`, and all writes on photos failed with `permission denied`. `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` failed with `must be owner`, and `CREATE TABLE` in `public` failed with `permission denied for schema public`. Over HTTP through PostgREST, all 8 write requests returned `401` with code `42501`, both with the anon JWT and with no JWT. The database was unchanged afterward.
4. **No service-role key.** `rg` for `service_role`, `SERVICE_ROLE`, `SUPABASE_*KEY`, `sb_secret`, and `eyJhbGci` across the repo (excluding `node_modules`) finds only `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the warning comment in `web/.env.example`. `git log -p --all` has no matches. The only env file in the tree is `web/.env.example`, and `.gitignore` still ignores `.env*` apart from it. `createAnonClient()` reads only the URL and anon key, with `persistSession: false` and `autoRefreshToken: false`. `repository.ts` is imported only by server components. The only `"use client"` file in `web/` is `app/error.tsx`, so the client isn't bundled for the browser today.
5. **No address or contact columns.** The `listings` columns are slug, title, summary, description, category, space_type, neighborhood, city, state, price, capacity_label, the availability window, featured, is_demo, status, sample_host_label, sort_order, and timestamps. There is no street, house number, latitude/longitude, phone, email, or host user ID. `listing_photos` has no EXIF or location fields. The seed's titles name streets (Olivia, Seventh, State Street, Packard, South Main) but give no house numbers, and every row is `is_demo = true`. The mapped `Listing` object that reaches the UI has no address or contact field (`m2-security-repository-e2e.log`).
6. **Draft invisible.** As `anon`, in SQL and over HTTP, the draft returned nothing when looked up by slug, by `status=eq.draft`, by its UUID, through its photo's `listing_id`, or through an inner join from photos to listings with `listings.status=eq.draft`. Through the real `repository.ts` and `supabase-js`, `getPublishedListing("hidden-sample-draft")` returns `null` and `searchListings` returns the 8 published slugs without it. On the running dev server, `/listings/hidden-sample-draft` returns 404, but that 404 comes from `web/proxy.ts`'s local allowlist before the database is queried. The repository test is what covers the database path.

## How I tested

All logs are in `/opt/cursor/artifacts/`.

- **Live `college_space` database (read-only).** I inspected catalog metadata (`\dp`, `pg_policies`, `information_schema` grants, `pg_class`, `pg_auth_members`, `pg_proc`, `pg_default_acl`). I ran the anon and authenticated probes inside one `BEGIN ... ROLLBACK` with `ON_ERROR_ROLLBACK` (`m2-security-anon-probe.log`). Every write was refused before reaching the rollback, and a superuser count afterward showed 9 rows and 0 tampered. One line in that log can mislead: `set role postgres` succeeds there only because the psql session logs in as the superuser. Through the PostgREST-style login described next, the same command fails with `permission denied to set role "postgres"`.
- **`verify-rls.sql` on the live database.** Exit 0 (`m2-security-verify-rls.log`).
- **Throwaway Postgres 16 cluster** (`/tmp/m2sec-pg`, socket-only, port 55432), so nothing non-read-only touched `college_space`. I created Supabase-like roles (`anon`, `authenticated`, `service_role`, and a login `authenticator`) and Supabase's default privileges (`GRANT ALL` on new `public` tables, functions, and sequences to `anon`, `authenticated`, and `service_role`). Then I applied the migration and seed twice. After both passes, `anon` and `authenticated` hold only `SELECT`: the migration's `revoke all` strips Supabase's default `ALL`. The re-run is idempotent, with 9 listings and 9 photos (`m2-security-supabase-sim.log`).
- **PostgREST 12.2.3** against that cluster, using `db-anon-role = anon` and an HS256 anon JWT, which is how Supabase serves the anon key. A small prefix shim mapped `/rest/v1` so unmodified `supabase-js` could connect. Raw HTTP probes are in `m2-security-postgrest-http.log`. Running the real `searchListings` and `getPublishedListing` from `web/lib/repository.ts` through `npx tsx` is in `m2-security-repository-e2e.log`. Both scripts are saved next to the logs.
- **Unit tests.** `npm test --prefix web`: 2 files, 16 tests passed (`m2-security-unit-tests.log`).
- **Weakening the schema on purpose.** I broke the policies and grants 11 ways, each in a fresh database copy, and ran `verify-rls.sql` against each (`m2-security-verify-mutants.log`, script `m2sec-mutants.sh`). See nonblocking issue 1.

## Blocking issues

None. All six required properties hold in the live database, in a simulated Supabase role setup, and over HTTP through PostgREST.

## Nonblocking issues

Ordered by how much I would want each fixed. Item 1 should be fixed before any milestone adds a write policy.

1. **`verify-rls.sql` doesn't detect write-access regressions** (`web/supabase/verify-rls.sql`). It catches every read-side break I tried: a permissive listings policy, a permissive photos policy, and RLS disabled on either table. It passed all seven write-side breaks, and in every one, anon really could write:

   | Weakened schema | `verify-rls.sql` | What anon could do |
   |---|---|---|
   | INSERT grant plus `WITH CHECK (status = 'published')` | passes | inserted a published listing |
   | UPDATE grant plus policy | passes | set a price to 1 cent |
   | DELETE grant on photos plus policy | passes | deleted all 8 photos |
   | TRUNCATE grant (RLS doesn't apply to TRUNCATE) | passes | truncated both tables |
   | `GRANT ALL`, policies unchanged | passes | truncated both tables |
   | Column-level `UPDATE (price_cents)` plus policy | passes | set a price to 1 cent |
   | UPDATE for `authenticated` only | passes | set a price to 1 cent |

   There are two causes. First, the only write test is one INSERT that omits `status`, so it inserts a `draft`, and a policy that allows published inserts still rejects it with the same `42501` the test expects. Second, nothing tests UPDATE, DELETE, TRUNCATE, photo writes, or the `authenticated` role. The cheapest fix is to assert privileges directly, before `set role anon`: `has_table_privilege` for INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, and TRIGGER, and `has_any_column_privilege` for INSERT, UPDATE, and REFERENCES, checked for both `anon` and `authenticated` on both tables. Also assert that no non-SELECT policy exists on either table. `/opt/cursor/artifacts/m2sec-proposed-write-check.sql` is a version I tested. Together with the existing read checks, it catches all 11 weakened variants, and it passes on the live `college_space` database. If you keep a behavioral INSERT test, set `status = 'published'` explicitly.
2. **The RLS check isn't runnable from a documented command.** Nothing in the repo says how to apply the migration and seed or run `verify-rls.sql`. It isn't part of `npm test`. `web/README.md` still says the app "does not connect to Supabase". `AGENTS.md` §7 asks for one documented test command and treats access control as needing tests. Document the `psql` sequence (or add a script) so the next reviewer and CI run the same check.
3. **Drafts are filtered only by RLS** (`web/lib/repository.ts`). That matches `docs/QUALITY_STANDARDS.md`, which makes RLS the authorization boundary. But if `NEXT_PUBLIC_SUPABASE_ANON_KEY` were ever set to a service-role key, drafts would be served with no error, because `mapListingRow` checks `is_demo` but not `status`. Cheap defense in depth: add `.eq("status", "published")` to both queries, or refuse a key whose JWT `role` claim isn't `anon` when creating the client. Also, the `NEXT_PUBLIC_` prefix means Next will inline the value into any client component that reads it. That's fine for the anon key, but it's one more reason the wrong key must never go in that variable.
4. **A malformed listing URL returns HTTP 500** (`web/proxy.ts`, outside the requested file list). `decodeURIComponent` throws on bad percent-encoding. On the dev server, `/listings/%` and `/listings/%E0%A4%A` return 500, and the response includes the `URIError` stack trace (`m2-security-proxy-http.log`). I did not check whether a production build hides the stack. Catch the error and return the existing 404 page.
5. **Anon can read more columns than the app uses.** Anon can select `id`, `status`, `sort_order`, `created_at`, and `updated_at`, which `repository.ts` doesn't request. None of them is sensitive now. Column-level `GRANT SELECT (...)` would enforce least privilege before Milestone 4 adds host-owned columns, which are likely to be sensitive. Optional.
6. **Forward-looking: free text and photo paths have no structural guard.** `title`, `summary`, `description`, `capacity_label`, `sample_host_label`, `alt`, and `listing_photos.path` are unconstrained text. That's fine while only the seed writes them. When hosts write listings (Milestone 4), a house number or phone number can go in a description, and `path` goes directly into `next/image`'s `src`. Plan validation and moderation (for example, an allowlisted storage prefix for `path`) alongside the host write policies.
7. **Forward-looking, not verified: prerendered pages may outlive unpublishing.** `generateStaticParams` lists listing IDs from the local file, and the homepage was static in Milestone 1. If pages are rendered from the database at build time, unpublishing a listing might not hide it until the next build or revalidation. Milestone 2 has no way to unpublish, so nothing is exposed now. I did not run a production build to check. Confirm the caching behavior before Milestone 4 adds unpublish or delete.

## Outside security scope

- `docs/DEVELOPMENT_STATUS.md` and `docs/DEVELOPMENT_PLAN.md` still say Milestone 2 has not been approved, and `development/tasks/` has no Milestone 2 task file. I'm noting this for the lead manager; it isn't a security finding.
- The scratch Postgres cluster (port 55432), PostgREST (`127.0.0.1:3010`), and the prefix shim (`127.0.0.1:38411`) are still running in tmux sessions `m2sec-scratch-pg`, `m2sec-postgrest`, and `m2sec-shim` so the probes can be re-run. They serve only the throwaway `sb_sim` database, not `college_space`.
