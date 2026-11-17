# M2 preview review: deployed read-only catalog

Verdict: APPROVE WITH NONBLOCKING ISSUES

Reviewer: independent review manager (`.cursor/agents/review-manager.md`). I did not write this implementation. I did not edit application code, migrations, or other docs. This file is the only repo file I changed, and nothing is committed.
Date: 2026-10-14.

- Preview: https://college-space-git-cursor-milestone-e841d6-arohi-nairs-projects.vercel.app
- Commit reviewed: `559e464` ("Remove the temporary catalog query probe."), branch `cursor/milestone-2-catalog-aeea`. `git status` was clean, and `git ls-remote` shows `559e464` as the remote branch head. GitHub's Vercel status for `559e464` is `success` (04:38:10Z), so the branch preview serves this commit.
- New since the reviews in `M2-review.md` and `M2-security.md`, which covered what became `07c1e63`: `aa813b3` (503 when the database does not answer), `c0d6041` and `559e464` (a temporary health probe, added and then removed), and `08350ad` (use the project origin). Touched files: `web/proxy.ts`, `web/lib/listing-access.ts`, `web/lib/supabase.ts`, `web/app/catalog-health/route.ts`, `web/lib/hosted-catalog-check.mjs`, `web/scripts/verify-hosted-catalog.mjs`, `web/app/error.tsx`, and tests, README, `.env.example`, and `package.json`. `web/supabase/` is unchanged since `07c1e63`.

Every acceptance criterion in `development/tasks/M2-catalog.md` passes on the deployed preview, including criterion 8: a live Supabase catalog and a Vercel preview that reads it. When a configured database does not answer, the proxy returns 503 within 4.0 s, as required. The issues below are real but don't fail a criterion. The most important is that the page's own query can still take about 23 s and return 200 when the database fails *after* the proxy's check passes.

## Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Milestone 1 cleanup | Pass. On the preview the host line reads "Sample host: Marcus L. Available May 1, 2026 – Aug 20, 2026.", with one period. Unknown listing URLs return 404 with the designed card. The date-filter tests pass. Photos match their space types in my captures and in the supplied ones. |
| 2 | Migration, RLS, anon select only; idempotent seed; `verify-rls.sql` passes | Pass. Re-run at this commit. |
| 3 | Pages read published rows when the env vars are set, and the checked-in catalog otherwise | Pass on the preview (Supabase). The no-env path builds and was covered locally in `M2-review.md`. |
| 4 | Filters in the URL; range contained in the window; reversed dates swapped; no cross-unit price comparison | Pass on the preview. All nine requested URLs match the seed windows. |
| 5 | Unknown and unpublished slugs 404; demo labels and "requests are not open" stay; visual system stays | Pass on the preview |
| 6 | `npm test`, `npm run lint`, `npm run build` pass | Pass |
| 7 | No service-role key, no anon writes, no accounts, booking, or payments | Pass |
| 8 | Live Supabase and a Vercel preview that reads it | **Met.** `/catalog-health` reports `source: supabase, ok: true`, and the pages render database rows. See nonblocking issue 3 for what this can't prove about the hosted draft. |

## What I ran

Logs and screenshots are in `/opt/cursor/artifacts/` with the prefix `m2-preview-review-`. No `NEXT_PUBLIC_SUPABASE_*` variable was set in my shell for the repo commands.

| Check | Result |
|---|---|
| `cd web && npm test` | Exit 0. 4 files, 29 tests passed: `catalog.test.ts` 14, `listing-access.test.ts` 10, `supabase.test.ts` 3, `repository.test.ts` 2. `m2-preview-review-test.log` |
| `cd web && npm run lint` | Exit 0, no findings. `m2-preview-review-lint.log` |
| `npm run build`, no env, on a `git archive 559e464` export | Exit 0. "hosted-catalog-check skipped (no Supabase env)". `m2-preview-review-build-noenv.log` |
| `npm run build` with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3041/rest/v1/` (note the suffix), on a second export | Exit 0. The build gate printed `ok: true, publishedCount 8, photoCount 8, draftVisible false, writeDenied true`. `m2-preview-review-build-local.log` |
| curl on the preview: `/catalog-health`, `/`, nine `/search` URLs, eight `/listings/*` URLs | See "Deployed checks" |
| Headless Chrome on the preview at 390 and 1280 px, nine pages each | See "Rendered UI" |
| Local outage matrix: the 3041 build, served on 3044, behind a relay I could switch between healthy, hang, reset, and HTTP 500 | See "Outage behavior" |
| Migration and seed applied twice to a fresh `m2pv_sim`, then `verify-rls.sql`; also `verify-rls.sql` on `m2rev_sim` | Both exit 0. `m2-preview-review-rls.log` |
| `checkHostedCatalog` against `m2pv_sim` as seeded, weakened, and restored | See "RLS and the health check" |

The scratch databases are in the security reviewer's throwaway Postgres cluster (socket `/tmp/m2sec-sock`, port 55432). The anon JWT I used was minted from the local PostgREST config's secret. I didn't use or fetch any hosted key.

## Deployed checks (curl)

`GET /catalog-health`: HTTP 200 in 1.5 s, with `cache-control: no-store`:

```json
{"source":"supabase","ok":true,"problems":[],"publishedCount":8,"photoCount":8,"draftVisible":false,"writeDenied":true}
```

The body contains no key or project URL.

`GET /` (GET, not HEAD): HTTP 200 with `x-catalog-source: supabase`. The response was also `x-vercel-cache: HIT` (age 4612 s), so the proxy runs in front of the edge cache. The featured section is a streamed dynamic part (`$RS("S:1","P:1")`, `$RC("B:0","S:0")`). The HTML has 6 listing links, 6 Demo badges, no `digest`, and no "Invalid path". The three "Loading spaces" strings are the Suspense fallback and its copy in the flight payload, and the stream replaces the fallback.

`/search` (`m2-preview-review-search.log`). Every request returned 200 with `x-catalog-source: supabase`, no `digest`, and its Suspense content resolved.

| Query | Heading | Results, in order |
|---|---|---|
| none | All demo spaces in Ann Arbor | all 8 |
| `category=storage` | Summer & semester storage | kerrytown-garage, water-hill-summer |
| `neighborhood=Water+Hill` | in Water Hill | water-hill-summer |
| `category=monthly-parking&neighborhood=Burns+Park` | Monthly & semester parking in Burns Park | burns-park-driveway |
| `from=2026-09-01&until=2026-12-01` | from Sep 1, 2026 to Dec 1, 2026 | burns-park-driveway, old-west-semester, south-main-carport |
| `from=2026-12-01&until=2026-09-01` | from Sep 1, 2026 to Dec 1, 2026 | the same 3 |
| `from=2026-06-01` | on Jun 1, 2026 | kerrytown-garage, water-hill-summer |
| `until=2026-10-04` | on Oct 4, 2026 | burns-park-driveway, stadium-lawn, old-west-semester, south-main-carport, eberwhite-saturday |
| `from=2026-01-01&until=2026-01-02` | from Jan 1, 2026 to Jan 2, 2026 | none: the designed "Nothing in the demo inventory matches." state |

I derived the expected sets from the windows in `web/supabase/seed.sql` before looking, and every row matches:
- **Containment.** `stadium-lawn` (Sep 5 – Nov 21) and `eberwhite-saturday` (Sep 12 – Oct 31) overlap Sep 1 – Dec 1 but are excluded. `south-main-carport` starts exactly on Sep 1 and is included, so the boundary is inclusive.
- **Reversed pairs.** A reversed pair gives the same results as the forward pair.
- **A single date.** A lone `from` or `until` is treated as one day.
- **Form state.** The category, neighborhood, and date controls echo the URL: `selected` on the options and `value` on the date inputs.

`/listings/*` (`m2-preview-review-listings.log`):

| Path | HTTP | Notes |
|---|---|---|
| `/listings/kerrytown-garage` | 200 | Title "Lockable garage near Kerrytown · College Space". The rendered markup has the h1, `$110 / month`, "Sample host: Marcus L. Available May 1, 2026 – Aug 20, 2026.", and "Requests are not open". It has 1 Demo badge, no `digest`, no "Marcus L..", and all four Suspense boundaries resolved. |
| `/listings/burns-park-driveway`, `/listings/stadium-lawn` | 200 | Same structure |
| `/listings/not-a-listing` | 404 | The proxy's "That listing isn't in the demo catalog." page, with `x-catalog-source: supabase` |
| `/listings/hidden-sample-draft` | 404 | Same page. The body never contains "Unpublished sample" or "Draft H." |
| `/listings/KERRYTOWN-GARAGE`, `/listings/%25`, `/listings/slug,or` | 404 | Rejected by the slug check before any lookup |

## The `/rest/v1` origin fix

`web/lib/supabase.ts` now passes `supabaseProjectOrigin(url)` to `createClient`. That is `new URL(url.trim()).origin` for http and https URLs, and anything else falls back to the file catalog. `supabase-js` appends `rest/v1/` to whatever it is given, so the origin can't double the path. The proxy's lookups and the health check build absolute `/rest/v1/...` paths with `new URL(path, env.url)`, which already ignore any path in the env URL. That is why `/catalog-health` passed during the live failure while the page client didn't.

I confirmed this with the real library (2.117.3) in a throwaway test on an export of the commit (`m2-preview-review-origin.log`, test saved as `/tmp/m2pv/zz-review-origin.test.ts`):
- A bare `createClient("http://127.0.0.1:3041/rest/v1/")` requested `/rest/v1/rest/v1/listings` and got an error. My local shim returns 404 where the hosted gateway says "Invalid path specified in request URL".
- With `NEXT_PUBLIC_SUPABASE_URL` set to that same suffixed URL, the repo's `searchListings` and `getPublishedListing` requested only `/rest/v1/listings`:
  - They returned all 8 listings and the Kerrytown row.
  - They returned `null` for the draft.
  - For the reversed pair, they sent `available_from=lte.2026-09-01&available_until=gte.2026-12-01`.

The production build in the outage test also used the suffixed URL, and its pages rendered database rows.

## Outage behavior

`web/proxy.ts` matches `/`, `/search`, and `/listings/:id`. When Supabase is configured:
- On listing routes it calls `publishedListingExists`.
- On `/` and `/search` it calls `catalogIsReachable`.
- Both are plain `fetch` calls with `AbortSignal.timeout(4000)`.
- A failed lookup becomes `"unavailable"` in `listingDecision`, and the proxy returns its 503 page with `x-catalog-source: supabase`, `retry-after: 5`, and `cache-control: no-store`.
- There is no path from a failed lookup to the checked-in file. `fileSlugs` is used only when `lookup === "file"`, which happens only when `supabasePublicEnv()` is null.

I didn't touch the public preview. The local 3044 server is a production build of `559e464`, configured through a relay that I switched between modes (`m2-preview-review-outage.log`):

| Relay mode | `/`, `/search`, `/search?category=storage&from=2026-12-01&until=2026-09-01`, `/listings/kerrytown-garage`, `/listings/not-a-listing`, `/listings/hidden-sample-draft` | `/catalog-health` |
|---|---|---|
| healthy | 200 / 200 / 200 / 200 / 404 / 404, `x-catalog-source: supabase` | 200, `ok: true` |
| hang (accepts the connection, never answers) | **503 in 4.00 s** each, `x-catalog-source: supabase`, title "Catalog unavailable · College Space" | 503 in 8.0 s, "The operation was aborted due to timeout" |
| connection reset | 503 in about 3 ms each | 503, "fetch failed" |
| HTTP 500 | 503 in about 2 ms each | 503, "published read failed (500)" |
| healthy again | same as the first row | 200, `ok: true` |

No mode produced a 200 or the file catalog for these routes. An unknown slug gets 503 during an outage, which is correct: without the database it can't be called missing. The 503 page's "Try again" link reflects the request path and query. Raw `"`, `<`, and `>` in the query arrive percent-encoded in the `href`, with no injected tags.

## RLS and the health check

The migration is unchanged. It enables RLS on `listings` and `listing_photos`, revokes everything from `public`, `anon`, and `authenticated`, then grants `SELECT` only, with two `FOR SELECT` policies on `status = 'published'`. Applied twice to a fresh `m2pv_sim`, it leaves 8 published listings, 1 draft, and 9 photos. `anon` and `authenticated` hold only `SELECT` on both tables, and `verify-rls.sql` exits 0. That matches what the preview reports: 8 published rows, 8 photos (the draft's photo is hidden), the draft invisible, and the anon insert denied.

`checkHostedCatalog` (`web/lib/hosted-catalog-check.mjs`) is the code behind `/catalog-health` and the build gate. I ran it against `m2pv_sim` through my own PostgREST (`m2-preview-review-health-negative-control.log`):

| Database state | Result |
|---|---|
| As seeded | `ok: true`, `draftVisible: false`, `writeDenied: true` |
| An extra anon `SELECT … USING (true)` policy | `ok: false`, "anonymous client can read a draft" |
| Anon `INSERT` grant and policy | `ok: false`, "anonymous insert was not denied (201)" |
| Draft row deleted, RLS intact | `ok: true`, `draftVisible: false` (see nonblocking issue 3) |
| Re-seeded | `ok: true`. Ended with 8 published, 1 draft, and SELECT-only grants. |

So the check catches the two regressions that matter. Client assets show no key either: no Supabase host, `eyJhbGci`, `sb_publishable_`, `sb_secret_`, `service_role`, `NEXT_PUBLIC_SUPABASE`, or `rest/v1` appears in the preview's nine client JS chunks or in its HTML. In the repo, `rg` for `service_role`, `sb_secret`, and `eyJhbGci` matches only the assertion in `listing-access.test.ts` that the request does not contain `service_role`. The only tracked env file is `web/.env.example`.

## Rendered UI

I drove a browser myself: headless Chrome against the preview, at 390×844 (mobile emulation) and 1280×900 (`m2-preview-review-browser.log`, `m2-preview-review-browser.json`, and `m2-preview-review-<page>-<width>.png`). For every page, I waited until no visible "Loading spaces" status remained.

- **No horizontal overflow.** `scrollWidth` equals the viewport on all 18 page and width combinations, and no visible element crosses either edge.
- **Content.** Demo badges and cards: 6 on `/`, 8 on `/search`, 2 for storage, 3 for the reversed range, 0 on the empty state, and 1 badge on each listing. "Requests are not open" and a single-period host line are on both listing pages. No image is broken or missing alt text, and no error boundary shows.
- **Requests and console.** The only failed requests are `/favicon.ico` (404, carried over from Milestone 1) and the intentional 404s, and those are also the only console errors.

I also inspected the supplied evidence:
- **Screenshots.** The nine `vercel-*.png` files are WebP data with `.png` names. Each is a 1280×800 capture of the desktop showing Chrome in DevTools device mode: 1280×973 for "desktop" and 390×924 for "mobile". They are timestamped 04:46–05:27, after `559e464` deployed, and show the preview URL. They agree with my captures:
  - 8 cards on search, and 3 cards for Sep 1 – Dec 1.
  - The designed empty state.
  - The Kerrytown listing at both widths, with its badge, price card, and "Requests are not open".
  - The proxy 404 card.
- **Video.** I sampled `m2-preview-catalog-walkthrough.mp4` (110 s) every 7 s. It walks the Kerrytown listing at desktop and mobile widths, the homepage with its categories and featured sections, search with a date filter, the 404 at both widths, and the mobile homepage. I didn't watch every frame.

The header, cards, fields, and footer match the Milestone 1 system. Photos match their space types: a garage interior for Kerrytown, a carport for South Main, and driveways for Burns Park and Old West. The earlier note that several don't look like Michigan still stands (`M2-review.md`, new nonblocking issue 4).

## Nonblocking issues

1. **The page query's 4-second limit is per attempt, and `postgrest-js` retries it.**
   - The cause: `createAnonClient` in `web/lib/supabase.ts` adds `AbortSignal.timeout(4000)` inside the custom `fetch`. `postgrest-js` 2.117 retries GET requests up to 3 times on a rejected fetch (backoff of 1, 2, and 4 s). It skips retrying a timeout only when the signal is on the request it built itself (`request.signal?.aborted`), so it treats this one as a network error.
   - The proxy's own probes are plain `fetch` and are not affected. A database that doesn't answer at all still gets a 503 in 4.0 s.
   - The case it does affect: the database answers the proxy's small probe, then fails the page query. I reproduced this with a relay mode that answers only `select=slug` requests:
     - If the page query hangs, `/`, `/search`, and `/listings/kerrytown-garage` return **HTTP 200 after 23.0 s**. The relay log shows four page-query attempts.
     - If the page query gets an HTTP 500, they return 200 at once.
     - Either way the HTML carries an error `digest` and the error boundary renders.
   - This is the narrower remainder of `M2-review.md` new nonblocking issue 2. The 200 itself is structural: the prerendered shell is sent before the query runs.
   - The duration is fixable. Add `.abortSignal(AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS))` to the two queries in `web/lib/repository.ts`, or `.retry(false)`. `postgrest-js` doesn't retry an aborted request whose signal it was given. The README's "Catalog requests time out after four seconds" sentence would then be accurate. Evidence: `m2-preview-review-outage-partial.log`.
2. **The public `/catalog-health` route writes on every request.** `checkHostedCatalog` POSTs a *published* `anon-write-probe` row and then tries a DELETE. Today the insert is denied, which is the point. If an RLS regression ever allowed anon inserts without deletes, each hit would leave a published, photo-less row that anonymous clients can read. I reproduced this on `m2pv_sim` and then restored it. `mapListingRow` throws for a published listing with no photo, so that row would break `/` and `/search` on the running deployment while the health check reports the problem. Consider keeping the write probe in the build-time script `web/scripts/verify-hosted-catalog.mjs` and dropping it from the public GET route. The route also uses an 8-second timeout per request (up to three sequential requests), which is fine for a diagnostic endpoint.
3. **`draftVisible: false` can't tell "hidden by RLS" from "not seeded".** With the draft row deleted and RLS intact, the check still reports `ok: true`. Nobody outside can confirm the hosted draft exists without the service-role key, and I didn't try. The founder or lead should run `select status, count(*) from public.listings group by 1` once in the Supabase SQL editor, expecting `draft 1, published 8`, and run `web/supabase/verify-rls.sql` there. The local RLS evidence and the negative control above show the policy works when the row exists.
4. **A reversed date pair stays reversed in the form.** For `?from=2026-12-01&until=2026-09-01`, the heading and results use Sep 1 – Dec 1. But the sidebar still shows From 12/01/2026 and Until 09/01/2026 (`m2-preview-review-search-reversed-1280.png`). This meets criterion 4, which concerns the query. It's a small UX inconsistency.
5. **The new 503 page is a second hand-written HTML copy in `web/proxy.ts`.** It has the same fonts from Google's CDN, hard-coded colors, and no nav or footer as the 404 page (`M2-review.md`, earlier nonblocking issue 3, still open). The proxy is the only place that can set the status before the streamed shell, so this is a reasonable trade-off. The duplication will drift.
6. **Evidence file names.** The `vercel-*.png` files are WebP data, and the "mobile" ones are device-mode captures inside a 1280×800 desktop screenshot. They're usable but easy to misread. My PNGs at true widths are in `m2-preview-review-*-390.png` and `m2-preview-review-*-1280.png`.
7. **Carried over, still open:**
   - The `/favicon.ico` 404.
   - The `verify-rls.sql` column-grant gap.
   - The "See all N" count, capped by `.limit(24)`.
   - The photo-taste notes.

   All are in `M2-review.md` and `M2-security.md`. Nothing here contradicts either review.

## Left running

- tmux `m2pv-relay`: the relay on `127.0.0.1:3041` (to the `/rest/v1` shim on 38421) and its control port 3043, left in `ok` mode.
- tmux `m2pv-web-3044`: the `559e464` production build at `/tmp/m2pv/web`, built with the suffixed URL `http://127.0.0.1:3041/rest/v1/`, on `127.0.0.1:3044`. To repeat the outage check, run `curl 127.0.0.1:3043/mode/hang` (or `reset`, `500`, `partial-hang`, `partial-500`, `ok`), then `/tmp/m2pv/outage.sh`.
- tmux `m2pv-postgrest` (PostgREST on 3045, serving `m2pv_sim`) and `m2pv-shim2` (`/rest/v1` shim on 3046).
- The scratch database `m2pv_sim` in the throwaway cluster, restored to 8 published, 1 draft, and SELECT-only grants. I didn't change `m2rev_sim`, `sb_sim`, or `college_space`, and I didn't stop any earlier server or session.
