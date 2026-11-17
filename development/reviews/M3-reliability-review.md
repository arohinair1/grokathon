# M3 phase A review: catalog reliability

Verdict: APPROVE WITH NONBLOCKING ISSUES

Reviewer: independent review manager (`.cursor/agents/review-manager.md`). I did not write this change. I edited no application code and nothing under `web/`. This file is the only repo file I changed, and it is not committed. I did not start authentication work.
Date: 2026-10-14.

- Commit reviewed: `4e26bb8` ("Bound catalog failures and stop health-check writes."), branch `cursor/milestone-3-accounts-aeea`. `git ls-remote` shows `4e26bb8` as the remote head. GitHub's Vercel status for `4e26bb8` is `success` (15:09:04Z), so the preview serves this commit.
- Preview: https://college-space-git-cursor-milestone-4dc157-arohi-nairs-projects.vercel.app
- Task: `development/tasks/M3-reliability.md`

All eight acceptance criteria pass. A database that is down or hangs returns 503 from every catalog route in 4.0 s, with one upstream request and no retry. Milestone 2 took 23 s and four attempts in the same case. A query that fails after the proxy check passes shows the designed unavailable state, never cards, an empty result, a digest, or database text. `/catalog-health` now only reads.

## Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | A read stops in about 4 s and isn't retried | Pass. `.abortSignal(AbortSignal.timeout(4000))` and `.retry(false)` on both queries, plus `db: { timeout, retry: false }` on the client. In postgrest-js 2.117.3, `retry(false)` turns off the retry in `fetchWithRetry`. Relay: 4.0 s and one page-query hit (table below). |
| 2 | An empty result stays empty, and a failure doesn't fall back to the file | Pass. Unit tests cover `[]` → `[]` and 500 → `CatalogUnavailable`. File fallback happens only when `createAnonClient()` returns null (no env). Preview: `/search?from=2028-01-01&until=2028-02-01` shows the empty state with 0 cards. |
| 3 | No database error text in the page | Pass. The relay's error body (`relation secret_table does not exist`, `42P01`) appears in no page. The server log records only the code. `/catalog-health`'s catch now says only "catalog check failed". |
| 4 | Proxy check fails → `/`, `/search`, `/listings/:id` return 503 | Pass. `down` and `hang` return 503 on all five paths. |
| 5 | Check passes, page query fails → unavailable state, not cards, empty, or digest | Pass, with HTTP 200 as the task allows. My ruling is below. |
| 6 | A missing or unpublished slug returns 404 when the database answers | Pass locally (`ok`, `partial`, `partial-hang`) and on the preview. |
| 7 | `/catalog-health` is read-only, and write denial stays in the build script and SQL | Pass. The route calls `checkHostedCatalogRead`, which only sends GET (unit test, plus relay log: two GETs per call). `scripts/verify-hosted-catalog.mjs` still calls `checkHostedCatalog`, which adds `checkAnonymousWriteDenied`. The preview body has no `writeDenied`. |
| 8 | Healthy home, search, date filter, detail, and 404s still work | Pass on the preview and locally. |

## What I ran

- `cd web && npm test`: 5 files, 36 passed. `does not retry a hanging read` took 4005 ms.
- ESLint on an exact export of the commit: exit 0. `next build` of that export passed. `/`, `/search`, and `/listings/[id]` are partial prerenders. Their prerendered HTML has only the "Loading spaces" fallback, so neither cards nor the unavailable state is baked into the static shell.
- The 3052 server's `.next/BUILD_ID` is from 15:06:31, before the commit at 15:08:13. So I also ran `git archive 4e26bb8 web` into `/tmp/m3rev`, built it, and served it on 3061 behind a logging pass-through (3071 → 3048), so upstream requests could be counted. I ran the same matrix on 3052 without counts, and the results matched.

### Hosted preview (no keys printed)

| Request | Status | Notes |
|---|---|---|
| `/catalog-health` | 200, `no-store` | `{"source":"supabase","ok":true,"problems":[],"publishedCount":8,"photoCount":8,"draftVisible":false}`, no `writeDenied` |
| `/` | 200 | `x-catalog-source: supabase`, 6 featured listing links |
| `/search?from=2026-09-01&until=2026-12-01` | 200 | `supabase`. burns-park-driveway, old-west-semester, south-main-carport: the three windows that contain the range. The reversed pair gives the same three. |
| `/listings/kerrytown-garage` | 200 | `supabase`, h1 "Lockable garage near Kerrytown". The "isn't in the demo catalog" strings are the not-found boundary in the flight payload, not rendered. |
| `/listings/not-a-listing` | 404 | Designed not-found card |
| `/listings/hidden-sample-draft` | 404 | Designed not-found card |

### Local relay (exact-commit build on 3061)

Modes are from `/tmp/m3-catalog-relay.js`. `down` returns 500 with a fake schema error. `hang` never answers. `partial` returns 500 for every query except the proxy probes. `partial-hang` hangs every query without `limit=1`. "Hits" counts upstream requests for one page load.

| Mode | `/` | `/search?…` | `/listings/kerrytown-garage` | missing / draft slug |
|---|---|---|---|---|
| ok | 200, 0.13 s, 2 hits, 6 cards | 200, 3 cards | 200, listing h1 | 404, 1 hit |
| down | 503, 0.004 s, 1 hit | 503 | 503 | 503 |
| hang | **503, 4.003 s, 1 hit** | 503, 4.004 s, 1 hit | 503, 4.003 s, 1 hit | 503, 4.0 s |
| partial | 200, unavailable state, 0 cards, 2 hits | same | same, title "Catalog unavailable" | 404 |
| partial-hang | **200, 4.02 s, 2 hits** (probe plus one page query), unavailable state | 200, 4.02 s, 2 hits | 200, 4.03 s, 2 hits | 404 |

No response in any mode contained a digest, the relay's error text, or the empty-result copy. The 200 unavailable bodies are `Cache-Control: private, no-cache, no-store` locally and use `role="alert"`.

I could not cause failures on the hosted preview, so failure behavior is verified locally only. I judged pages from HTML over curl. I did not view the rendered UI in a browser.

## Ruling: is the HTTP 200 a misleading success response?

It does not fail the founder's rule. The rule is "an honest failure when the configured database does not answer" (`docs/PRODUCT_DIRECTION.md`, Milestone 3). When the database does not answer, every catalog route returns a real 503 from the proxy in 4 s. The 200 happens only after the proxy has just received a valid answer to a query with the same column shape, and then the page's query fails. In that case:

- A real status isn't feasible in the current architecture. `cacheComponents` serves a prerendered static shell, and the status line is sent before the streamed catalog section runs. The App Router has no API for setting a 503 from a component at that point. Getting one would mean dropping partial prerendering, and even then an unhandled error gives a 500 with the error page and digest, not a 503. That is a stack-level change outside this task.
- The body is not a disguised success. It has no cards and no "0 listings" empty state. It says the catalog can't be reached and that the page is not showing the sample list. It is `no-store`, so the failure isn't cached.
- `/catalog-health` checks the same tables and returns 503 for the same faults, so monitoring still sees the failure.

One gap leaves a real status feasible but unused. It doesn't fail a criterion, and it is nonblocking issue 1.

## Nonblocking issues

1. **The listing-route probe does not use the page's query shape.** `publishedListingExists` in `web/lib/listing-access.ts` selects only `slug`. `catalogIsReachable` was changed in this commit to select `PUBLISHED_LISTING_COLUMNS`, "so a bad catalog query fails before the page". A persistent fault that affects only the page columns, such as the `listing_photos` embed or RLS on photos, passes the slug probe. Every listing page would then return 200 with the unavailable state indefinitely, where a real 503 is feasible. The relay's `partial` mode shows the 200 path. Fix: select `PUBLISHED_LISTING_COLUMNS` in `publishedListingExists`, still filtered by slug, status, and `limit=1`, and add a test like `asks for the same columns the pages render`.
2. **The 200 unavailable state is indexable.** In `web/app/listings/[id]/page.tsx`, `generateMetadata` returns `{ title: "Catalog unavailable" }` with no robots directive. Add `robots: { index: false }` to that branch. The proxy's 503 and 404 pages already send `noindex`. The home and search metadata are static and can't change after the shell is sent, which is acceptable.
3. **No automated test covers the page-level catch.** Repository tests prove `CatalogUnavailable` is thrown. No test proves `/`, `/search`, or the listing page render `CatalogUnavailableState` instead of reaching `app/error.tsx`. I verified it only through the relay. A small render test of `FeaturedListings` or `SearchResults` with a rejecting repository would lock in criterion 5.
4. **The 3052 server predates the commit.** Its build is from about two minutes before `4e26bb8` was committed. My exact-commit build produced the same results, so the task file's local numbers hold, but future relay checks should rebuild first.
5. **Carried forward, outside these criteria.** The hosted draft row is still uncounted. `draftVisible: false` cannot tell a hidden draft from a missing one. `development/reviews/M3-draft-verification.md` and `docs/DEVELOPMENT_STATUS.md` already record this.
