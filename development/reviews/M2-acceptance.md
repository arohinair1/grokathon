# M2 lead acceptance

Status: accepted with nonblocking issues. Milestone 2 is complete enough to stop. It is not merged, and it is not a production release.

Date: 2026-10-14.

Commit: `559e464` on `cursor/milestone-2-catalog-aeea`.

Preview: https://college-space-git-cursor-milestone-e841d6-arohi-nairs-projects.vercel.app

The independent review in `development/reviews/M2-preview.md` is APPROVE WITH NONBLOCKING ISSUES. The reviewer did not write the implementation. They ran the test suite, lint, and builds, curled the preview, checked date containment against the seed, and reproduced a database outage locally. A database that does not answer returns HTTP 503 in about 4 seconds with `x-catalog-source: supabase`. The preview's `/catalog-health` reports 8 published listings, 8 photos, no visible draft, and a denied anonymous write.

Accepted:

- Published demo rows are served from the hosted Supabase project. The homepage, search, and listing pages send `x-catalog-source: supabase`.
- Category, neighborhood, and date filters match the seed windows. A requested range must sit inside the listing window. A reversed pair is queried as the swapped range. A lone from or until is one day.
- Unknown and unpublished listing URLs return 404. Demo labels and "Requests are not open" stay.
- The page client uses the project origin, so a Preview URL that includes `/rest/v1` does not request `/rest/v1/rest/v1`.

Not in this acceptance:

- Do not merge to `main`.
- Do not promote this branch to production.
- Do not start Milestone 3.
- Vercel Authentication stays off until a production deployment exists. Then turn it back on at college-space → Settings → Deployment Protection.

Nonblocking follow-ups, from `development/reviews/M2-preview.md`:

- If the proxy's small check succeeds and the page query then fails, the streamed page can still return HTTP 200 with an error boundary. A hanging page query can take about 23 seconds because the Supabase client retries. A total outage is still a 4-second 503.
- `/catalog-health` attempts an anonymous insert on each request. That insert is denied today.
- The health check cannot tell a hidden draft from a draft that was never seeded. In the Supabase SQL editor, `select status, count(*) from public.listings group by 1` should show one draft and eight published rows.
