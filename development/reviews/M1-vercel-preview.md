# M1 Vercel preview review

Verdict: APPROVE WITH NONBLOCKING ISSUES

Reviewer: independent review manager (`.cursor/agents/review-manager.md`). I did not deploy this site or write the code.
Date: 2026-10-14.

## What was reviewed

- Deployment: https://college-space-e0ao989ie-arohi-nairs-projects.vercel.app/, checked between 01:00 and 01:10 UTC with `curl` and headless Chrome 154.
- Which build this is: Vercel posted "Deployment has completed" on commit `b914e9d`, the head of `cursor/milestone-1-shell-aeea`, at 00:40 UTC. Its comment on [PR #1](https://github.com/arohinair1/college-space/pull/1) labels the deployment Preview, gives root directory `web`, and links the branch alias `college-space-git-cursor-milestone-8dcb78-arohi-nairs-projects.vercel.app`. The homepage and listing HTML from that alias are byte-identical to the URL under review. `/search` differs only in per-request React IDs, which also change between two requests to the same URL. `git diff a08dbc9 b914e9d -- web` is empty, so the deployed app is the task's commit `a08dbc9`. I had no Vercel dashboard access, so I matched the URL to the commit by content, not by a deployment record.
- Rendered UI: I saw it. I took screenshots at 390 and 1280 px, full-page captures, and DOM measurements through the Chrome DevTools protocol. Files are listed under "Artifacts".

## Founder's checks

| # | Check | Result |
|---|---|---|
| 1 | Home, search, and listing return the app, not a Vercel login | Pass |
| 2 | Demo labels present; listing says requests are not open and nothing is charged | Pass |
| 3 | Every referenced `/images/` file returns 200 with a non-trivial body | Pass |
| 4 | No broken layout at 390 px (and 1280 px) | Pass |
| 5 | No deployment error page | Pass |

1. `/`, `/search`, and `/listings/kerrytown-garage` each returned HTTP 200 `text/html` with no redirect and `server: Vercel` (76,939, 98,824, and 29,656 bytes). Their `h1`s are "Space around campus, from the people who live here.", "All demo spaces in Ann Arbor", and "Lockable garage near Kerrytown". Neither the HTML nor the rendered text contains "Vercel Authentication", "Log in to Vercel", or an SSO marker.
2. In the browser I counted 6 `Demo` badges on the 6 featured homepage cards, 8 on the 8 search results, and 1 on the listing. The listing page shows "About this sample", "Sample host", and "This card is demo inventory, not a real offer." Its side panel is headed "Requests are not open" and says: "This preview does not take booking requests, hold a space, or charge a card. When requests exist, they will be nonbinding: a host can accept or decline, and acceptance will still not be a paid reservation." Every footer says "This preview uses demo listings. Nothing here is a reservation, and nothing is charged." The only submit button on any page is "Search spaces". No control offers booking, reserving, paying, or checkout, and no page references Stripe. The other seven listing pages each returned 200 with one `Demo` badge and the "Requests are not open" panel.
3. `web/lib/catalog.ts`, `web/app/page.tsx`, and `web/components/home/host-band.tsx` reference 11 files. Each returned 200 `image/jpeg` and is byte-identical to its copy in `web/public/images/`:

   | File | Bytes |
   |---|---|
   | `brick-house.jpg` | 317,173 |
   | `brick-street.jpg` | 508,024 |
   | `craftsman.jpg` | 649,705 |
   | `driveway-modern.jpg` | 405,521 |
   | `evening-driveway.jpg` | 445,357 |
   | `front-lawn.jpg` | 293,199 |
   | `front-porch.jpg` | 657,730 |
   | `garage-workshop.jpg` | 216,354 |
   | `hero-street.jpg` | 229,457 |
   | `side-yard.jpg` | 507,409 |
   | `storage-boxes.jpg` | 252,303 |

   The pages load images through `/_next/image`. Every `src` in the three pages' HTML returned 200 `image/jpeg`, and so did sampled `srcset` widths 384, 640, and 828. In Chrome, all images decoded with a nonzero natural width at both viewport widths: 12 of 12 on `/`, 8 of 8 on `/search`, 1 of 1 on the listing. Every `<img>` has non-empty `alt` (but see nonblocking issue 1).
4. On all three pages at both 390 and 1280 px, `document.documentElement.scrollWidth` equals the viewport width, and no element's box extends past either edge. At 390 px the header fits on one line. The hero, search form, cards, and footer stack in one column, with no overlapping text, clipped controls, or missing images. At 1280 px the hero is two columns, search shows a filter sidebar beside a two-column grid, and the listing has a side panel for price and request status.
5. No page contains a Vercel error code (`DEPLOYMENT_NOT_FOUND`, `FUNCTION_INVOCATION_FAILED`, `404: NOT_FOUND`), and Chrome recorded no JavaScript exceptions. An unknown route, `/no-such-page`, returns the app's own 404 page ("That page isn’t here."), not a Vercel page. The only failed request is `/favicon.ico` (404).

## Task acceptance criteria

The founder scoped this review to the five checks. For completeness, against `development/tasks/M1-vercel-preview.md`:

1. Test, lint, and build pass on `b914e9d`. Vitest ran 9 of 9 tests, ESLint printed nothing, and `next build` generated 13 of 13 pages. All three exited 0 and left the working tree clean.
2. Publicly reachable: pass.
3. Pages load, including images: pass.
4. Demo listings labeled, no operational booking or payment: pass.
5. Partly done. `web/README.md` records root directory `web` but not the preview URL. Recording the URL is the infrastructure engineer's next step now that a URL exists. It does not change the verdict on the deployment, but the task is not closed until it lands.
6. I could not verify that the production branch is still `main` without dashboard access. The commit status is on the feature branch, Vercel's PR comment labels the deployment Preview, and the response carries `x-robots-tag: noindex`.

## Blocking issues

None. All five founder checks pass, and so do the task's tests, lint, and build.

## Nonblocking issues

1. **Most photos don't show what their alt text describes.** I viewed each file in `web/public/images/` and compared it to the alt text and captions in `web/lib/catalog.ts`, `web/app/page.tsx`, and `web/components/home/host-band.tsx`. Nine of 11 do not match. Some mismatches are visible to every user: the "Football & event parking" card and the game-day lawn listing show a dining room, the carport listing shows a swimming pool, and the hero caption calls an apartment tower "a residential street". `docs/QUALITY_STANDARDS.md` requires useful alt text. `M1-design.md` flagged only the storage photo.

   | File | Used for | Alt text says (summarized) | Photo shows |
   |---|---|---|---|
   | `hero-street.jpg` | Homepage hero | A tree-lined residential street of detached houses (caption: "Demo photograph of a residential street") | A white mid-rise apartment block against a blue sky |
   | `front-lawn.jpg` | Event-parking category; `stadium-lawn` | A front lawn in front of a house | A dining table and living room, indoors |
   | `side-yard.jpg` | Host band | A house exterior with a side path and garden | An indoor staircase with pendant lights |
   | `garage-workshop.jpg` | Storage category; `kerrytown-garage` | A garage interior with a workbench | A close-up of a man holding a wooden-handled tool at a machine |
   | `evening-driveway.jpg` | `south-main-carport` | A house at dusk with a paved drive | A white house in daylight behind a swimming pool and palm trees |
   | `brick-house.jpg` | `old-west-semester` | A two-story brick house with a front walk | A wooden A-frame house lit at dusk |
   | `brick-street.jpg` | `eberwhite-saturday` | A brick row of houses on a narrow street | One dark wood-sided house beside a paved lane |
   | `storage-boxes.jpg` | `water-hill-summer` | Moving boxes stacked on a wood floor | Movers unloading a truck on a city street |
   | `driveway-modern.jpg` | Monthly-parking category; `burns-park-driveway` | A modern house with a wide concrete driveway (and garage) | A modern house seen from its back lawn; no driveway or garage in view |
   | `craftsman.jpg` | Graduation category | A white craftsman house with a front walk and lawn | Close: a gray-shingled house with a white porch on a lawn |
   | `front-porch.jpg` | `packard-graduation` | A house porch with chairs and a front garden | Close: a white bungalow with a front porch |

   This task forbids edits to `web/app`, `web/components`, and `web/lib`, so the fix needs its own task. For listing cards, replacing a photo is better than rewording alt text, because the photo is the main evidence of the space. The hero caption and every `imageAlt` should describe what the photo actually shows.
2. **Double period after host initials.** `web/app/listings/[id]/page.tsx` renders `Sample host: {listing.hostName}. Available …`. Five of eight host names end in a period, so those pages read "Sample host: Marcus L.. Available May 1, 2026 …".
3. **No favicon.** `/favicon.ico` returns 404, and Chrome logs a console error on first load.
4. **The search sidebar is tight at 1280 px.** The neighborhood select truncates "All of Ann Arbor" to "All of Ann A", and the date inputs cut their placeholders to "mm/dd/yy" (`m1-vercel-search-1280.png`).
5. **The repo still says Vercel is not linked.** `development/tasks/M1-vercel-preview.md` says "Status: blocked on Vercel account linking". `docs/DEVELOPMENT_STATUS.md` says "Vercel is not linked in this environment" and lists connecting Vercel as a next step. The infrastructure engineer should update both along with `web/README.md`.
6. **The preview is public while Vercel Authentication is off.** Both the hashed URL and the branch alias serve the site without a login. Every new push to this branch creates another public deployment until protection is back on. Re-enable it when the founder is done viewing, unless the preview is meant to stay public.
7. **Carried over from `M1-review.md`, still true on the deployment.** `/listings/not-a-listing` returns HTTP 200 instead of 404. Listing pages have no title of their own, so every listing tab reads "College Space".

## Commands run

- `curl` for status, headers, and HTML on the three pages, the seven other listings, `/no-such-page`, `/listings/not-a-listing`, and `/favicon.ico`.
- `curl` for the 11 `/images/` files, compared with `cmp` against `web/public/images/`, plus the `/_next/image` URLs from the HTML.
- `gh api` for the Vercel commit status and the PR comment.
- `npm test --prefix web`, `npm run lint --prefix web`, `npm run build --prefix web` on `b914e9d`. All exited 0.
- The founder's exact screenshot command exited 21 here. The `/usr/local/bin/google-chrome` wrapper pins the profile directory of a desktop Chrome that was already running. I ran the same binary, `/usr/bin/google-chrome-stable --headless --disable-gpu --window-size=W,1400 --screenshot=…`, with a temporary `--user-data-dir` and `--no-sandbox`. A DevTools-protocol script then measured overflow, image decoding, failed requests, and console errors, and took full-page captures.

## Artifacts

In `/opt/cursor/artifacts/`:

- `m1-vercel-{home,search,listing}-{390,1280}.png`: the founder's command, 1400 px tall
- `m1-vercel-{home,search,listing}-{390,1280}-full.png`: full-page captures
- `m1-vercel-browser-checks.json`: per page and width: overflow, image decoding, `Demo` count, failed requests, console errors
- `m1-vercel-{test,lint,build}.log`
