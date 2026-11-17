# M2 independent review: read-only catalog

## Re-review after fixes (current verdict)

Verdict: APPROVE WITH NONBLOCKING ISSUES

Reviewer: independent review manager (`.cursor/agents/review-manager.md`). I did not write this implementation or the fixes. I did not edit application code, migrations, or docs. This file is the only repo file I changed, and nothing is committed.
Date: 2026-10-14.

Both blocking issues from the first review are fixed. I confirmed each one myself instead of relying on the author's evidence. Criteria 1–7 pass. Criterion 8 is still unmet because no hosted Supabase project or Vercel preview exists. That's an external blocker and doesn't affect this verdict.

One piece of the author's evidence is wrong. Three of the four `m2-fix-*` screenshots show the old photos, because the 3016 server's image-optimizer cache still holds them. A clean build renders the new photos correctly; see "Blocking issue 1".

### What was re-reviewed

- The same uncommitted working tree on `cursor/milestone-2-catalog-aeea`. New since the first review:
  - `web/lib/listing-access.ts` and `web/lib/listing-access.test.ts`.
  - Changes to `web/proxy.ts`, `web/lib/repository.ts`, `web/lib/catalog.ts`, `web/supabase/seed.sql`, `web/components/home/host-band.tsx`, `web/public/images/CREDITS.md`, and four JPEGs.
  - `web/app/listing-not-found/` is deleted.
- My server-side checks ran against copies of `web/` in `/tmp/m2rereview/`. When I wrote this section, `diff -rq` (excluding `node_modules` and `.next`) found no differences between them and the repo.

### Acceptance criteria

| # | Criterion | First review | Re-review |
|---|---|---|---|
| 1 | Milestone 1 cleanup | Fail (photos) | Pass |
| 2 | Migration, RLS, anon select only; idempotent seed; `verify-rls.sql` passes | Pass | Pass (re-run) |
| 3 | Pages read published rows when the env vars are set, and the checked-in catalog otherwise | Partial | Pass. A published row that exists only in the database now opens with 200. |
| 4 | Filters in the URL; range contained in the window; reversed dates swapped; no cross-unit price comparison | Pass | Pass (date oracle re-run: 0 mismatches) |
| 5 | Unknown and unpublished slugs 404; demo labels, "requests are not open", and the Milestone 1 visual system stay | Fail with Supabase configured | Pass. A draft row whose slug is in `catalog.ts` now returns 404. |
| 6 | `npm test`, `npm run lint`, `npm run build` pass | Pass | Pass |
| 7 | No service-role key, no anon writes, no accounts, booking, or payments | Pass | Pass |
| 8 | Live Supabase and a Vercel preview that reads it | Unmet: external blocker | **Unmet: external blocker.** Not a reason for this verdict. |

### Checks I ran

Before the checks, I found that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` were still exported in my shell from the first review's Supabase-configured copy. I unset both and ran everything afterward. Each repo log starts with the number of `NEXT_PUBLIC_SUPABASE` variables in the environment, which was 0. Logs are in `/opt/cursor/artifacts/` with the prefix `m2-rereview-`.

| Command | Result |
|---|---|
| `npm test --prefix web` | Exit 0. 3 files, 22 tests passed: `catalog.test.ts` 14, `listing-access.test.ts` 6, `repository.test.ts` 2. `m2-rereview-test.log` |
| `npm run lint --prefix web` | Exit 0, no findings. `m2-rereview-lint.log` |
| `npm run build --prefix web` | Exit 0. Next.js 16.4.0 (Turbopack), 13 static pages; the first review had 14, and the orphan `/listing-not-found` is the one gone. `/` is static; `/search` and `/listings/[id]` are partial prerender; the proxy is present. `m2-rereview-build.log` |
| Migration and seed applied twice to `m2rev_sim`, then `verify-rls.sql` | Both passes succeeded. `verify-rls.sql` exits 0, with 8 published, 1 draft, and the new photo alt values. `m2-rereview-rls.log` |
| A fresh copy of `web/` built with both env vars pointing at local PostgREST, served on 3028 | Exit 0, 13 pages, every listing path partial prerender. `m2-rereview-build-supabase.log` |

The repo rebuild kept the same static chunk names, and 3015 and 3016 kept serving afterward. I didn't re-run `verify-rls.sql` on `college_space`: the file is unchanged since the first review, and the migration and seed it checks pass in `m2rev_sim`.

### Blocking issue 1 (photos): resolved

I opened the four replaced files in `web/public/images/`. I compared each with `imageAlt`, `summary`, and the "The sample photo shows…" sentence in `web/lib/catalog.ts`, and with `listing_photos.alt` in `web/supabase/seed.sql`:

| Listing (space type) | File | Photo shows | Alt text |
|---|---|---|---|
| `kerrytown-garage` (Garage) | `garage-workshop.jpg` | A cluttered garage interior: shelves of supplies, a red tool chest, a workbench, and stored gear | "A garage interior with shelves, tools, and stored gear". Matches. |
| `burns-park-driveway` (Driveway) | `driveway-modern.jpg` | A white house with a concrete driveway leading to garage doors | "A white house with a driveway and a garage door". Matches. |
| `south-main-carport` (Carport) | `evening-driveway.jpg` | An SUV parked under a white carport on pavers | "A car parked under a carport beside a house". Matches. |
| `old-west-semester` (Driveway) | `brick-house.jpg` | A single-story house with a two-car garage and a wide concrete driveway | "A paved driveway leading to a garage in front of a house". Matches. |

- The "Monthly & semester parking" and "Summer & semester storage" category cards reuse two of these files, and their alt text was updated to match. The host band's `side-yard.jpg` alt now reads "An indoor staircase with pendant lights", which is what it shows.
- `catalog.ts` and `seed.sql` agree. A throwaway test (`m2-rereview-parity.review.test.ts`) ran the real `searchListings` and `getPublishedListing` against PostgREST and deep-compared the results with `catalog.listings`, including `imageAlt`. Both tests passed, the draft returned `null`, and the date check found 0 mismatches over 3,249 from/until pairs (`m2-rereview-parity.log`).
- `CREDITS.md` records all four files with their Unsplash photo IDs. It names the photographer for two of them.
- A clean build with no image cache (server 3027) renders the new photos on listing pages and in the search grid at 390 and 1280 px: `m2-rereview-listings-kerrytown-garage-1280.png`, `m2-rereview-listings-burns-park-driveway-1280.png`, `m2-rereview-listings-south-main-carport-390.png`, `m2-rereview-listings-old-west-semester-1280.png`, and `m2-rereview-search-1280.png`.

**The author's screenshots don't prove this fix.** `m2-fix-kerrytown-garage.png`, `m2-fix-burns-park-driveway.png`, and `m2-fix-south-main-carport.png` show the new captions over the old photos. In the Kerrytown screenshot, a man holds a tool at a machine under "A garage interior with shelves, tools, and stored gear". Only `m2-fix-old-west-semester.png` shows the new photo.

The source isn't the cause. On 3016 the raw `/images/*.jpg` files are byte-identical to the repo. But for all four files, `/_next/image?url=…&w=640` returns `X-Nextjs-Cache: HIT` with the old optimized WebP, while `w=1200` returns `MISS` and the new photo (`m2-rereview-image-cache-3016.log`, `m2-rereview-3016-cached-garage-workshop-640.webp`). `next/image` keeps optimized copies in `.next/cache/images`, which survives rebuilds, and looks them up by source path. When a filename is reused for a different photo, a server that cached the old one keeps serving it until the entry expires. See new nonblocking issue 1.

### Blocking issue 2 (proxy 404): resolved

How `web/proxy.ts` now decides:
- It checks the slug with `isListingSlug` (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) before anything else.
- Without the env vars, it falls back to the checked-in slug set.
- With them, it calls `publishedListingExists` in `web/lib/listing-access.ts`. That makes an anon GET to `/rest/v1/listings?select=slug&slug=eq.<slug>&status=eq.published&limit=1` with a 4-second timeout.
- An empty result returns 404. A failed lookup (`null`) lets the request through to the page.

Six new unit tests cover the file fallback, a checked-in slug that is unpublished, a database-only slug, unsafe slugs, `status=eq.published` in the request URL, and a 500 response returning `null`.

Results on server 3028, a fresh copy of `web/` built against PostgREST on `m2rev_sim` (`m2-rereview-proxy-3028.log`):

| Request | Database state | HTTP |
|---|---|---|
| `/`, `/search`, `/listings/kerrytown-garage`, `/listings/stadium-lawn` | As seeded | 200 |
| `/listings/hidden-sample-draft` (the seeded draft) | As seeded | 404 |
| `/listings/not-a-listing`, `/listings/%`, `/listings/%E0%A4%A`, `/listings/KERRYTOWN-GARAGE`, `/listings/slug,or`, `/nope` | As seeded | 404 |
| `/listings/stadium-lawn` | Set to `draft`, still in `catalog.ts` | **404.** The body h1 is "That listing isn't in the demo catalog.", with no draft title or summary. It also drops out of `/search?category=event-parking` and the homepage feature row. |
| `/listings/db-only-garage` | Published row inserted only in the database | **200.** The h1 is "Database only garage", and `/search?category=storage` links to it. |
| `/listings/db-only-garage` | That row deleted | 404 on the next request |

These results match every line of the author's `m2-proxy-db-check.log`. Afterward I restored `m2rev_sim` to 8 published and 1 draft. 3028 again returns 200 for `stadium-lawn` and 404 for `db-only-garage` and `hidden-sample-draft`.

Without the env vars (server 3027), the four listings I opened return 200, and `/listings/not-a-listing` returns 404 with the proxy's not-found page (`m2-rereview-browser-checks.json`).

### Rendered UI (server 3027, 390 and 1280 px)

I loaded `/`, `/search`, `/search?category=storage`, four listing pages, and an unknown listing in headless Chrome (`m2-rereview-browser-checks.json`, `m2-rereview-*-390.png`, `m2-rereview-*-1280.png`):

- No page overflows horizontally: `scrollWidth` equals the viewport on every page.
- Demo badges: 6 on `/`, 8 on `/search`, 2 on the storage filter, and 1 on each listing page.
- "Requests are not open" appears on every listing page. No page contains "X.. Available".
- The only failed requests are `/favicon.ico`, carried over from Milestone 1, and the intentional 404.
- The header, cards, fields, and footer are unchanged from Milestone 1.

### Security

Nothing contradicts `M2-security.md`:
- The proxy's lookup uses the same public anon key and SELECT-only access as the pages.
- A slug that fails the regex, such as the filter-shaped `slug,or`, gets a 404 before any lookup.
- `rg` for `service_role`, `sb_secret`, and `eyJhbGci` in `web/` matches only a `listing-access.test.ts` assertion that the request does *not* contain `service_role`.
- `rg` for write calls, auth, Stripe, and checkout in `web/app`, `web/components`, `web/lib`, and `web/proxy.ts` finds nothing.
- The only env file is `web/.env.example`.

`verify-rls.sql` is unchanged, so its column-grant gap (first review, nonblocking issue 6) is still open.

### Status of earlier nonblocking issues

Resolved:
- The host band's alt text (issue 2).
- The duplicate listing fetch (issue 4): `getPublishedListing` is now wrapped in React `cache()`.
- The orphan `/listing-not-found` route (part of issue 3): deleted.
- The unused helpers in `repository.ts` (part of issue 7).

Still open:
- `hero-street.jpg` is still a film scan with sprocket holes (issue 1).
- The proxy's 404 page is still hand-written HTML, with no nav or footer and fonts from Google's CDN (rest of issue 3; `m2-rereview-listings-not-a-listing-1280.png`).
- The Supabase query builder still has no unit test (issue 5). The new parity run found no disagreement.
- The `verify-rls.sql` column-grant gap (issue 6).
- Small items (issue 7):
  - The "See all N" count is still capped by `.limit(24)`.
  - "concrete" is still in the alt text for `front-porch.jpg` and `brick-street.jpg`.
  - The task file still names port 3014.
  - I didn't re-check the dev `instant-shell-url-data` warning.

### New nonblocking issues

1. **Local servers show stale optimized photos.** Any server that optimized the old photos keeps serving them at the cached widths; this is why the author's screenshots are wrong. Before taking evidence screenshots, clear `web/.next/cache/images` or restart from a clean `.next`. Giving replaced photos new filenames would avoid stale copies in any cache. I didn't check how Vercel's image cache handles a reused filename.
2. **A database outage returns 200 after about 7 seconds.** With the `/rest/v1` shim stopped, `/`, `/search`, `/listings/kerrytown-garage`, and `/listings/not-a-listing` each took about 7.0 s and returned 200. The listing page showed the designed error state ("This page didn't load." with "Try again") and an empty document title (`m2-rereview-outage.json`, `m2-rereview-outage-1280.png`). Letting requests through when the lookup fails favors availability, which is reasonable. But an unknown slug then gets 200, not 404, and the error page has no title and no 5xx status.
3. **Each listing view makes two PostgREST requests.** The proxy's lookup and the page's `getPublishedListing` each query the database, and `cache()` can't dedupe across the proxy boundary. This is fine at demo scale.
4. **Several photos don't look like Ann Arbor.** The new photos match their copy, but some are visibly not Michigan: palm trees behind the South Main carport, dry landscaping at Old West, and a Spanish-style hillside house at Burns Park. The Kerrytown garage is very cluttered and looks a lot like Water Hill's `storage-boxes.jpg` in the grid. The site labels photos as demo images, so this is a taste call for the founder, not a correctness issue.
5. **File names and credits.**
   - `brick-house.jpg` now shows a stucco house.
   - No page references `craftsman.jpg`.
   - `CREDITS.md` has no photographer for `driveway-modern.jpg` or `brick-house.jpg`, and it lists `craftsman.jpg` and `side-yard.jpg` as unattributed.

### Left running (re-review)

- The original servers on 3011–3016 (repo `web/`) and the author's 3017. I didn't stop any of them.
- PostgREST on `127.0.0.1:3020` (tmux `m2rev-postgrest`) and the `/rest/v1` shim on `127.0.0.1:38421` (tmux `m2rev-shim`, restarted after the outage test).
- 3027: a fresh no-env copy at `/tmp/m2rereview/web-fresh` (tmux `m2rr-fresh`).
- 3028: a fresh Supabase-configured copy at `/tmp/m2rereview/web-fresh-sb` (tmux `m2rr-fresh-sb`).
- 3025 and 3026 from the first review are still running, but both serve outdated code. Ignore them.
- I re-seeded `m2rev_sim` during this re-review, so its titles no longer carry the `[db]` tags the first review describes. It has 8 published listings, 1 draft, and no `db-only-garage`.

---

# Earlier record: first review (REVISE, superseded by the re-review above)

Verdict: REVISE

Reviewer: independent review manager (`.cursor/agents/review-manager.md`). I did not write this implementation. I did not edit application code, migrations, or docs. This file is the only file I changed in the repo.
Date: 2026-10-14.

## What was reviewed

- The uncommitted working tree on `cursor/milestone-2-catalog-aeea` (base `2784069`): 23 modified files (`git diff --stat`: 317 insertions, 90 deletions, 7 replaced JPEGs), plus untracked `web/lib/repository.ts`, `web/lib/repository.test.ts`, `web/lib/supabase.ts`, `web/proxy.ts`, `web/supabase/` (migration, seed, `verify-rls.sql`, README), `web/app/listings/[id]/not-found.tsx`, `web/app/listing-not-found/page.tsx`, `web/.env.example`, `web/public/images/CREDITS.md`, and the M2 task and security review.
- Standards: `development/tasks/M2-catalog.md` criteria 1–7, `docs/PRODUCT_DIRECTION.md` (Milestone 2 scope), and `docs/QUALITY_STANDARDS.md`.
- Rendered UI: the nine screenshots I was given, plus my own headless-Chrome captures of the 3015 server at 390 and 1280 px. I could open and see every image.

## Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Milestone 1 cleanup | **Fail.** Three of eight listing photos still don't match their space type or captions (blocking issue 1). The host-label period, the HTTP 404 for unknown URLs, and the date-filter tests pass. |
| 2 | Migration, RLS, anon select only; idempotent seed; `verify-rls.sql` passes locally | Pass |
| 3 | Pages read published rows when the two env vars are set, and the checked-in catalog otherwise | Partial. Search, the homepage feature row, and listing pages read Postgres. But listing URLs are still gated by the checked-in slug list (blocking issue 2). |
| 4 | Filters stay in the URL; range contained in the window; reversed dates swapped; no cross-unit price comparison | Pass |
| 5 | Unknown and unpublished slugs 404; demo labeling and "requests are not open" stay; Milestone 1 visual system stays | **Fail** with Supabase configured. An unpublished slug returns HTTP 200 (blocking issue 2). Labels, request copy, and the visual system pass. |
| 6 | `npm test`, `npm run lint`, `npm run build` pass | Pass |
| 7 | No service-role key, no anon writes, no accounts, booking, or payments | Pass |
| 8 | Live Supabase and a Vercel preview that reads it | **Unmet: external blocker.** The founder hasn't provided a Supabase project. Outside this code review, and not a reason for this verdict. |

## Checks I ran

All logs are in `/opt/cursor/artifacts/` with the prefix `m2-review-`.

| Command | Result |
|---|---|
| `npm test --prefix web` | Exit 0. 2 files, 16 tests passed (`catalog.test.ts` 14, `repository.test.ts` 2). `m2-review-test.log` |
| `npm run lint --prefix web` | Exit 0, no findings. `m2-review-lint.log` |
| `npm run build --prefix web` | Exit 0. Next.js 16.4.0 (Turbopack), 14 static pages. `/` is static; `/search` and `/listings/[id]` are partial prerender. `m2-review-build.log` |
| `sudo -u postgres psql -d college_space -v ON_ERROR_STOP=1 -f web/supabase/verify-rls.sql` | Exit 0 (8 published, 1 draft). `m2-review-rls.log` |

Before rebuilding I copied `web/.next` aside. The rebuild produced the same chunk names; only `BUILD_ID` changed. The 3015 server kept serving: every JS and CSS asset referenced by `/`, `/search`, and `/listings/kerrytown-garage` returned 200 afterward.

## Blocking issues

### 1. Listing photos don't match their space type or captions (criterion 1)

I opened every file in `web/public/images/` and compared it with `imageAlt`, `summary`, and `description` in `web/lib/catalog.ts` and with the `listing_photos.alt` values in `web/supabase/seed.sql`:

| Listing (space type) | File | Copy says | Photo shows |
|---|---|---|---|
| `kerrytown-garage` (Garage) | `garage-workshop.jpg` | Alt: "Garage interior with a workbench along one wall". Summary: "A garage interior with a workbench and stored gear along the walls." | A close-up of a man in a cap and glasses holding a wooden-handled tool at a machine. You can't see a garage, a workbench, or storage. |
| `burns-park-driveway` (Driveway) | `driveway-modern.jpg` | Alt: "A modern house with a wide concrete driveway". Summary: "A straight driveway beside a brick house". | A timber-and-black modern house seen from its back lawn at dusk. There's no driveway and no brick. |
| `south-main-carport` (Carport) | `evening-driveway.jpg` (new in M2) | Alt and description: "A car parked under a carport between two houses". | A narrow driveway between two houses, with a car under a fabric cover and a silver sedan in front. There's no carport. `CREDITS.md` gives the photo page title as "a car parked in a narrow driveway between houses". |

`development/reviews/M1-vercel-preview.md` (nonblocking issue 1) flagged the first two files by name. It recommended replacing photos rather than rewording copy. Both files are unchanged in this diff, so their alt text still describes something the photo doesn't show. For Kerrytown, the summary and description were rewritten to describe a garage interior the photo doesn't contain. These are the first two cards on `/search` and on the homepage feature row (`m2-review-search-1280.png`, `m2-browser-search.png`, `m2-browser-listing.png`, `m2-review-listing-burns-1280.png`, `m2-review-listing-carport-1280.png`).

`old-west-semester` (Driveway) is weak too. `brick-house.jpg` shows a herringbone footpath, lined with shrubs, leading to a mansion's front door, while the copy calls it "a paved driveway".

**What to change:**
- Replace `garage-workshop.jpg`, `driveway-modern.jpg`, and `evening-driveway.jpg` with photos that show a garage interior, a driveway, and a carport. Alternatively, reassign photos between listings. For example, `storage-boxes.jpg` already shows a garage with a workbench.
- Update `imageAlt` and the description sentence that starts "The sample photo shows…" in `web/lib/catalog.ts`, and the matching `alt` in `web/supabase/seed.sql`, so all three agree with what each photo shows.
- The "Monthly & semester parking" and "Summer & semester storage" category cards in `web/lib/catalog.ts` reuse `driveway-modern.jpg` and `garage-workshop.jpg`, with the same false alt text. Fix them in the same pass.
- Record any new files in `web/public/images/CREDITS.md`.

### 2. With Supabase configured, unpublished slugs return 200 and database-only slugs 404 (criteria 5 and 3)

`web/proxy.ts` decides 404 from `listings` in `web/lib/catalog.ts`, not from the database. The page's own `notFound()` in `web/app/listings/[id]/page.tsx` can't set the status. With `cacheComponents` on, the response is a prerendered shell sent with 200 before the page's lookup runs (`x-nextjs-prerender: 1`, `x-nextjs-postponed: 1`). So with Supabase configured, publication status never decides the HTTP status:

- **Unpublished but in the checked-in file.** I set `stadium-lawn` to `draft` in my test database. `/search` and `/` dropped it, as they should. But `GET /listings/stadium-lawn` returned **HTTP 200**. The body is the designed not-found view with `<meta name="robots" content="noindex"/>`. None of the draft's title, summary, host, or price appears, so this isn't a data leak (`m2-review-unpublished-200-body.html`).
- **Published but only in the database.** I inserted a published `db-only-garage`. `/search?category=storage` linked to it, and `GET /listings/db-only-garage` returned **404**. A user who clicks that search result lands on "That listing isn't in the demo catalog." `web/README.md` documents this half, but documenting it doesn't meet criterion 3.
- The seeded `hidden-sample-draft` returns 404 only because its slug isn't in `catalog.ts`. The security review noted that this 404 comes from the allowlist. As a result, nothing in the current tests or checks exercises the "unpublished → 404" path.

**What to change:** when `supabasePublicEnv()` is set, have `web/proxy.ts` decide with an anon lookup (`select slug … where slug = $id and status = 'published'`), and keep the checked-in set for the unconfigured case only. Then add a regression check: a unit test of the proxy's decision with an injected lookup, or a documented `curl -o /dev/null -w '%{http_code}'` step. It should cover an unpublished slug that is in the checked-in file and a published slug that is only in the database.

Fixing this inside the page instead is not a quick change. In a throwaway copy, I removed `app/loading.tsx` and added `export const instant = false` to `app/page.tsx` and `app/listings/[id]/page.tsx`. That build passed, but `/listings/stadium-lawn` still returned 200 with `x-nextjs-postponed: 1`. Removing `app/loading.tsx` alone made the Supabase-configured build fail with Next's `blocking-prerender-dynamic` error. The as-is build and the experiment both returned 200 to curl, Chrome, and Googlebot user agents (`m2-review-experiment-loading.log`).

## Nonblocking issues

1. **The new hero photo is a scanned film frame.** `web/public/images/hero-street.jpg` includes sprocket holes and "KODAK PORTRA 400" edge printing on both sides. At 390 px the holes show along both edges of the hero (`m2-browser-home-mobile.png`). At 1280 px a dark film border shows along the top edge (`m2-browser-home.png`, `m2-home-form.png`). Crop the scan to the frame or pick another photo. This is the first image on the site.
2. **The host band's alt text is wrong.** `web/components/home/host-band.tsx` describes `side-yard.jpg` as "A house exterior with a side path and garden", but the photo is an indoor staircase with pendant lights. `M1-vercel-preview.md` flagged it, and it's unchanged. It isn't a listing photo, but `docs/QUALITY_STANDARDS.md` requires useful alt text.
3. **The proxy's 404 page is a hand-written copy of the design.** `missingListingHtml` in `web/proxy.ts` has no logo mark, no Browse or "List a space" nav, and no footer (`m2-browser-404.png`, `m2-review-404-390.png`). It loads Fraunces and Outfit from Google's CDN instead of `next/font`, and it hard-codes colors that will drift from `globals.css`. The card itself matches the app's empty state. Meanwhile, `web/app/listing-not-found/page.tsx` isn't referenced anywhere. It serves `/listing-not-found` with HTTP 200 and `noindex`, and it duplicates `web/app/listings/[id]/not-found.tsx`. If blocking issue 2 moves the 404 into the app, delete the inline HTML and the orphan route.
4. **The listing page fetches each listing twice.** `generateMetadata` and the page both call `getPublishedListing`, which means two PostgREST requests per view with Supabase configured. Wrapping it in React `cache()` would remove the duplicate.
5. **The Supabase query translation has no unit test.** The containment rule is tested through `filterListings` and `requestedRange`. The `.lte("available_from") / .gte("available_until")` and `status` filters in `web/lib/repository.ts` are not. My oracle run (see "How I tested") found no disagreement, but a test with a stubbed client would lock it in.
6. **`verify-rls.sql` doesn't check column-level write grants.** It catches table-level INSERT, UPDATE, and TRUNCATE grants and any non-SELECT policy. It misses a column-only `GRANT UPDATE (price_cents) … TO anon`, because `has_table_privilege` ignores column grants. That grant alone wasn't exploitable (`UPDATE 0` under RLS), and adding the policy it needs is caught. The security reviewer suggested `has_any_column_privilege` too.
7. **Small items:**
   - `publishedSlugList`, `isKnownCategory`, and `isKnownNeighborhood` in `web/lib/repository.ts` are unused.
   - `FeaturedListings` shows "See all N demo spaces" using a result count that `.limit(24)` caps.
   - In dev, `/listings/[id]` logs the `instant-shell-url-data` warning on every request (`params` read outside Suspense). The root `app/loading.tsx` is what lets the Supabase-configured build pass: without it, `/` and `/listings/[id]` fail to prerender. Keep it, or give those pages their own Suspense boundaries.
   - `front-porch.jpg` and `brick-street.jpg` alt texts say "concrete" for brick pavers and asphalt.
   - The task file still names port 3014 and two older screenshot names.

## Security follow-ups (confirmed in the files)

- `web/supabase/verify-rls.sql`: before `set role anon`, it loops over `anon` and `authenticated`, both tables, and INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, and TRIGGER with `has_table_privilege`. It also fails if any non-SELECT policy exists. On weakened copies of the database it failed for INSERT plus an insert policy, a TRUNCATE grant to `authenticated`, and an UPDATE grant plus policy to `authenticated`. The column-only gap is nonblocking issue 6.
- `web/lib/repository.ts`: `.eq("status", "published")` is on both `searchListings` and `getPublishedListing`.
- `web/proxy.ts`: `decodeURIComponent` is in a `try`/`catch`. On 3015, `/listings/%` and `/listings/%E0%A4%A` return 404 with the designed body and `x-robots-tag: noindex`, with no `URIError` or stack trace.
- Nothing in this diff contradicts `M2-security.md`. Blocking issue 2 concerns HTTP status, not access. The draft's content never reached the response. Security nonblocking item 2 (a documented RLS command) is addressed by the `psql` sequence in `web/README.md`.

## Evidence by criterion

- **1.** `sampleHostSentence` strips trailing periods. Its test asserts "Sample host: Marcus L. Available …". In Chrome, no listing page contains `X.. Available`. On 3015, `/listings/does-not-exist`, `/listings/hidden-sample-draft`, and `/listings/KERRYTOWN-GARAGE` return 404 with the designed card. `/nope` returns the app 404. The new tests cover a reversed pair that runs past the window, a range starting before the window, a lone `from` and a lone `until` outside the window, both window boundaries, and the existing single-day and reversed-inside cases.
- **2.** Migration: `alter table … enable row level security` on both tables, `revoke all` from `public`, `anon`, and `authenticated`, then `grant select` only, with two `FOR SELECT` policies on `status = 'published'`. In a fresh database `m2rev_sim`, set up with Supabase-style `ALTER DEFAULT PRIVILEGES … GRANT ALL`, I applied the migration and seed twice. Both passes succeeded, leaving 8 published, 1 draft, and 9 photos. `information_schema.role_table_grants` shows only `SELECT` for `anon` and `authenticated`, and `verify-rls.sql` exits 0. Through PostgREST with the anon JWT, a listings read returned the 8 published slugs, `slug=eq.hidden-sample-draft` returned `[]`, and a `POST` returned 401 with code `42501` (`m2-review-rls.log`).
- **3.** I built a copy of `web/` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` pointing at my PostgREST and served it on port 3025. The build exited 0, with `/` and the listing paths switching to partial prerender (`m2-review-build-supabase.log`). In that database I tagged every published title with `[db]`. `/search`, `/`, and `/listings/kerrytown-garage` rendered the tagged titles, and the listing page title was "Lockable garage near Kerrytown [db] · College Space" (`m2-review-http-supabase.log`). On 3015, with no env vars, the same pages render the checked-in catalog. Neither build has Supabase code in `.next/static`.
- **4.** On 3015 the form round-trips `category`, `neighborhood`, `from`, and `until` through the URL: `selected` on the options and `value` on the date inputs. Results:
  - `?category=storage&neighborhood=Kerrytown`: `kerrytown-garage`.
  - `?from=2027-05-03&until=2027-04-30`: `packard-graduation` and `south-main-carport`, headed "from Apr 30, 2027 to May 3, 2027".
  - `?from=2027-05-10&until=2027-05-01&category=university-event`: 0 results.
  - `?category=yacht&from=2026-02-31`: all 8.

  Running the real `searchListings` against PostgREST and `filterListings` on the checked-in catalog over 3,249 from/until pairs (57 dates: every window edge ±1 day, monthly dates, and empty) gave 0 mismatches (`m2-review-date-oracle.log`, `m2-review-date-oracle.test.ts`). Nothing in `web/app`, `web/components`, or `web/lib` sorts or compares prices. Search orders by `sort_order`.
- **5.** Chrome at 390 and 1280 px: 6 `Demo` badges on `/`, 8 on `/search`, and 1 on each listing page. "Requests are not open" appears on every listing page I checked. The header, footer, cards, and fields match Milestone 1. Failures are in blocking issue 2.
- **6.** See "Checks I ran".
- **7.** `rg` for `service_role`, `SERVICE_ROLE`, `sb_secret`, `SUPABASE_*KEY`, and `eyJhbGci` outside `node_modules`, `.next`, and reviews finds only `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.example`, `lib/supabase.ts`, and the README. The only env file is `web/.env.example`, with empty values. `rg` for write calls (`insert(`, `.update(`, `.delete(`, `.upsert(`, `rpc(`), auth, Stripe, checkout, and booking in `web/app`, `web/components`, `web/lib`, and `web/proxy.ts` finds only the "not a reservation" copy. The only `"use client"` file is `app/error.tsx`.

## Rendered UI

What I judged from the supplied screenshots (several come from the older 3014 server) and my own captures of 3015 (`m2-review-*-390.png` and `m2-review-*-1280.png`, metrics in `m2-review-browser-checks.json`):

- No horizontal overflow on any of eight pages at 390 or 1280 px: `scrollWidth` equals the viewport, and no element crosses either edge. The only failed requests were `/favicon.ico` (404, carried over from Milestone 1) and the intentional listing 404.
- The search sidebar is fixed. `m2-browser-search.png`, from 3014, still shows "Summer & s", "All of Ann A", and "mm/dd/yy". `m2-search-sidebar.png` and `m2-review-search-1280.png` from 3015 show full-width stacked fields. The homepage form uses two columns at 1280 and one at 390 (`m2-home-form.png`, `m2-home-form-mobile.png`).
- The empty state (`m2-browser-empty.png`) is the designed component with "Clear filters". A headline like "from Jan 1, 2026 to Jan 2, 2026" starts in lowercase, which was already true in Milestone 1.
- The listing page keeps the demo badge, neighborhood and city, the price card, and the nonbinding request copy (`m2-browser-listing.png`). The photo problems are in blocking issue 1 and nonblocking issue 1.

## Left running

- My scratch database `m2rev_sim`, in the security reviewer's throwaway cluster (socket `/tmp/m2sec-sock`, port 55432). Its titles carry `[db]` tags. I did not modify `sb_sim` or `college_space`.
- PostgREST on `127.0.0.1:3020` (tmux `m2rev-postgrest`).
- The `/rest/v1` shim on `127.0.0.1:38421` (tmux `m2rev-shim`).
- The Supabase-configured build on `127.0.0.1:3025` (tmux `m2rev-web-supabase`, serving `/tmp/m2review/web-sb`, an unmodified copy of `web/`).
- An experiment build on `127.0.0.1:3026` (tmux `m2rev-web-sb2`). It is not repo code: it lacks `app/loading.tsx` and adds `instant = false` to two pages. Ignore it for anything but blocking issue 2.
- 3015 is still serving the repo build.

To re-check blocking issue 2 after a fix:

```bash
psql -h /tmp/m2sec-sock -p 55432 -U postgres -d m2rev_sim -c "update listings set status='draft' where slug='stadium-lawn'"
```

Then rebuild the copy and request `/listings/stadium-lawn`.
