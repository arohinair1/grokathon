# M1 independent review

Verdict: APPROVE WITH NONBLOCKING ISSUES

Reviewer: independent review manager (`.cursor/agents/review-manager.md`). I did not write this code.
Date: 2026-10-13.

## What was reviewed

- Implementation: commit `c3f2f57` ("Add the Ann Arbor marketplace preview shell") on branch `cursor/milestone-1-shell-aeea`. The branch head is now `98714ef`, which only adds `development/reviews/M1-design.md`. `web/` is identical between the two commits and has no uncommitted changes, so the commands below ran against exactly the reviewed code.
- Docs: the committed doc edits in `c3f2f57` (`AGENTS.md`, `README.md`, `app/README.md`, `docs/DECISIONS.md`, `docs/MVP.md`, `tests/README.md`, `web/README.md`) plus the working-tree files named in the task (`docs/PRODUCT_DIRECTION.md`, `docs/QUALITY_STANDARDS.md`, `development/tasks/M1-preview-shell.md`, DEC-003). Those working-tree files are not committed yet.
- Rendered UI: **I did not visually review the site.** I did not open it in a browser and I saw no screenshots. I fetched HTML from the running dev server (`http://127.0.0.1:3000`) with `curl` to check status codes, demo labels, filter results, and copy. A curl of the HTML is not a visual review. Criterion 9 rests on `development/reviews/M1-design.md`, not on this review.

## Criteria checklist

| # | Criterion | Result |
|---|---|---|
| 1 | Next.js App Router, TypeScript, Tailwind, shadcn/ui in `web/` | Pass |
| 2 | Homepage, header, footer explain College Space and offer search | Pass |
| 3 | Demo listings labeled; filterable by category, neighborhood, dates | Pass |
| 4 | Listing page shows the sample; requests not open; nothing charged | Pass |
| 5 | Empty, loading, error patterns exist and are used | Pass |
| 6 | `npm test`, `npm run lint`, `npm run build` pass | Pass |
| 7 | No Supabase client, payment code, or binding reservation | Pass |
| 8 | Research files preserved; decisions in `docs/DECISIONS.md` | Pass |
| 9 | Coherent marketplace, usable at desktop and ~390px | Not assessed here (see `M1-design.md`) |

Evidence per criterion:

1. Next `16.4.0` with routes in `web/app/` (`page.tsx`, `search/page.tsx`, `listings/[id]/page.tsx`). `web/tsconfig.json` has `"strict": true`. Tailwind v4 via `@import "tailwindcss"` in `web/app/globals.css` and `@tailwindcss/turbopack` in `web/next.config.ts`. shadcn/ui: `web/components.json`, `web/components/ui/button.tsx`, and `cn` from shadcn-ui's `cn` package.
2. `web/app/page.tsx` has a hero that explains the product, with `SearchForm` beneath it. `web/components/site-header.tsx` has Browse and List a space links. `web/components/site-footer.tsx` says the preview uses demo listings, takes no reservations, and charges nothing.
3. Labels: the `Listing` type has `demo: true` as a literal, so every listing is typed as demo. `DemoBadge` sits on every `ListingCard` and on the detail page. Over HTTP I counted 8 `Demo` badges for 8 results on `/search`, 6 for 6 featured cards on `/`, and 1 on `/listings/kerrytown-garage`. Filters: `filterListings` in `web/lib/catalog.ts` handles category, neighborhood, and dates. The date check requires both ends of the requested range to fall inside `[availableFrom, availableUntil]`, inclusive. It normalizes a reversed pair and treats a lone `from` or `until` as a single day. I compared the real function against an independent containment oracle over every from/until pair, including empty, in a 401-day span: 161,604 queries, 0 mismatches. Over HTTP, a reversed pair (`from=2027-05-03&until=2027-04-30`) returned 1 result, and a stay running past the window returned 0 with the empty state.
4. `web/app/listings/[id]/page.tsx` renders the sample space and a "Requests are not open" panel. The HTML contains: "This preview does not take booking requests, hold a space, or charge a card. When requests exist, they will be nonbinding … acceptance will still not be a paid reservation."
5. Empty: the search no-results branch, the unknown-listing branch, and `web/app/not-found.tsx` all use `EmptyState`. Loading: `web/app/loading.tsx` plus `Suspense` fallbacks in the search and listing pages use `LoadingState`. Error: `web/app/error.tsx` renders `ErrorState` with `retry`, which is the documented, stable prop in Next 16.3+ (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`). I did not trigger an error at runtime.
6. All three exit 0 (output under "Commands run").
7. `rg` across `web/` (excluding `node_modules`/`.next`) found no `supabase`, `stripe`, payment, checkout, `"use server"`, `fetch(`, `process.env`, cookies, or API routes. The lockfile has no `@supabase`, `stripe`, or `@stripe` entries. The only form is `SearchForm`, a GET to `/search`. The word "booking" appears only in copy saying booking is not open.
8. `git diff --stat b4008d3 -- research docs/RESEARCH.md` is empty, and `git diff --diff-filter=D --name-only b4008d3` lists nothing, so research files are byte-identical and none were deleted. `research/STATUS.md` and `docs/RESEARCH.md` exist. DEC-001 and DEC-002 are committed in `docs/DECISIONS.md`. The root `app/` placeholder stays a README that points to `web/`.
9. Not assessed. See "What was reviewed".

## Commands run

All three ran from `/workspace` on 2026-10-13. Full logs are in `/opt/cursor/artifacts/m1-review-{test,lint,build}.log`.

`npm test --prefix web` exited 0:

```
> web@0.1.0 test
> vitest run

 RUN  v4.0.18 /workspace/web

 ✓ lib/catalog.test.ts (9 tests) 14ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

`npm run lint --prefix web` exited 0 with no findings:

```
> web@0.1.0 lint
> eslint
```

ESLint was silent, so I checked its coverage with `npx eslint --format json`: it covered 25 files, every `.ts`/`.tsx` file under `web/app`, `web/components`, and `web/lib`, plus the config files. It reported 0 errors and 0 warnings.

`npm run build --prefix web` exited 0:

```
▲ Next.js 16.4.0 (Turbopack)
- Cache Components enabled
- Partial Prefetching enabled
✓ Compiled successfully in 905ms
  Finished TypeScript in 1411ms ...
✓ Generating static pages using 3 workers (13/13) in 474ms

Route (app)
┌ ○ /
├ ○ /_not-found
├   /listings/[id]
│ ├ ◐ /listings/[id]
│ ├ ○ /listings/burns-park-driveway
│ ├ ○ /listings/kerrytown-garage
│ └ ◐ [+6 more paths]
└ ◐ /search
```

Additional checks:

- **Date-filter mutation test.** In a scratch copy at `/tmp/m1-mutants`, I injected one bug at a time into `filterListings` and ran the repo's tests. Repo code was not edited.

  | Injected bug | Existing tests |
  |---|---|
  | Overlap instead of containment | Caught |
  | Drop end-of-window check | Caught |
  | Exclusive boundaries | Caught |
  | Ignore dates entirely | Caught |
  | No reversed-pair normalization | **Not caught** |
  | Drop start-of-window check | **Not caught** |
  | Ignore a lone `from`/`until` | **Not caught** |

- **Containment oracle.** 161,604 queries, 0 mismatches against the real code (`/opt/cursor/artifacts/m1-review-oracle.log`).
- **HTTP status codes from the dev server.** `/` 200, `/search` 200, reversed-pair search 200 with 1 result, over-window search 200 with 0 results and the empty state, invalid params (`category=yacht&from=2026-02-31`) 200 with all 8 results, `/listings/kerrytown-garage` 200, `/listings/not-a-listing` **200**, `/no-such-page` 404.

## Blocking issues

None. Every acceptance criterion I could assess passes, and all three required checks pass.

## Nonblocking issues

Ordered by how much I would want each fixed before Milestone 2 builds on it.

1. **The date-filter tests don't protect three of the behaviors they appear to cover** (`web/lib/catalog.test.ts`). The code is correct, but three regressions survive the suite, including the reversed-pair case that `docs/QUALITY_STANDARDS.md` names. The test "accepts a single day and a reversed date pair" passes even with normalization removed: its reversed pair spans exactly the listing window, and the only `university-event` listing matches with or without a date filter. Add cases like these. I confirmed they pass on the current code and that each one fails one surviving mutant:
   - Reversed pair whose later date is past the window: `{ category: "university-event", from: "2027-05-10", until: "2027-05-01" }` returns `[]`.
   - Range starting before the window: `{ neighborhood: "Kerrytown", from: "2026-04-15", until: "2026-06-01" }` returns `[]`.
   - Lone date outside the window: `{ category: "university-event", from: "2027-06-01" }` and the same with `until` both return `[]`.

   The task file's revision ownership covers `web/components/`, `web/app/`, and `web/lib/catalog.ts`, not `web/lib/catalog.test.ts`. The lead manager would need to widen it for this fix.
2. **`docs/MVP.md` conflicts with the code.** Under "Target market and segment" it says "The data model keeps a city field so other college towns can be added later." The `Listing` type in `web/lib/catalog.ts` has no city field. Per `AGENTS.md` §3, I am flagging it rather than picking a side. Either correct the doc or add the field. `docs/PRODUCT_DIRECTION.md` says not to build multi-town expansion now, which argues for correcting the doc.
3. **Unknown listing IDs return HTTP 200** (`web/app/listings/[id]/page.tsx`). The unknown-ID branch renders an `EmptyState` inline instead of returning a 404, so `/listings/not-a-listing` is a soft 404 that crawlers and link checkers will treat as a real page. Return a real 404 (for example `notFound()` from `next/navigation`, or restrict params to the generated set) and confirm with `curl -I`.
4. **Empty and not-found pages have no `h1`.** `EmptyState` (`web/components/states.tsx`) renders an `h2`. On `web/app/not-found.tsx` and the unknown-listing branch it is the main heading, so those pages lack an `h1`. Consider a heading-level prop.
5. **Listing pages have no page title of their own.** `web/app/listings/[id]/page.tsx` has no `generateMetadata`, so every listing tab reads "College Space".
6. **The photo source claim isn't recorded in the repo.** `web/components/site-footer.tsx` says the photographs are "demo images from Unsplash". Nothing in the repo records source URLs or photographers for the 11 files in `web/public/images/`, and the files carry no provenance metadata. Given the repo's rule against unverifiable source claims, record provenance (for example `web/public/images/CREDITS.md`) or soften the footer line.
7. **Error boundary coverage.** No `web/app/global-error.tsx` exists, so an error in the root layout bypasses `web/app/error.tsx`. `ErrorState` is also not exercised by any test, and I did not trigger it.
8. **The test-location choice isn't in a decision record.** Tests are co-located under `web/lib/`. `AGENTS.md` §6 asks for that choice to be recorded in `docs/DECISIONS.md`. `tests/README.md` cites DEC-002 for it, but DEC-002 doesn't mention tests. A one-line note would close the gap.
9. **The acceptance basis is not committed.** At review time, `docs/PRODUCT_DIRECTION.md`, `docs/QUALITY_STANDARDS.md`, `docs/DEVELOPMENT_PLAN.md`, `docs/DEVELOPMENT_STATUS.md`, `development/tasks/`, `.cursor/agents/`, and the DEC-003 and `AGENTS.md` edits are untracked or modified, not in git. This approval is against those working-tree versions.
10. **Host names use mixed formats.** Some are initials ("Elena M.", "Marcus L.") and some are full names ("Helen Cho", "Ruth Alvarez", "Chris Feldman"). All are labeled as sample hosts. Using initials throughout would be more consistent and less likely to read as real residents, since titles name real streets (Olivia, Seventh, Packard).
