# M2 — Read-only catalog

Status: local implementation ready for review. A hosted Supabase project is not connected, so the milestone is not complete.
Owner: lead manager.

## Product direction

`docs/PRODUCT_DIRECTION.md`, Milestone 2 scope. DEC-004.

## Acceptance criteria

1. Milestone 1 cleanup: listing photos match their space type and captions, host labels do not double a period, unknown listing URLs return HTTP 404 with the designed page, and date-filter tests cover reversed ranges, windows outside availability, boundaries, and a single date.
2. `web/supabase/migrations/` creates the catalog tables, enables RLS, and grants anonymous select only. `web/supabase/seed.sql` is idempotent. `web/supabase/verify-rls.sql` passes on the local database.
3. Search and listing pages read published rows when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, and the checked-in catalog otherwise.
4. Category, neighborhood, and date filters stay in the URL. A requested range must sit inside the listing window. Reversed dates are swapped. Unlike price units are not compared.
5. Unknown and unpublished slugs 404. Demo labeling and “requests are not open” stay. The Milestone 1 visual system stays.
6. `npm test --prefix web`, `npm run lint --prefix web`, and `npm run build --prefix web` pass.
7. No service-role key, no anonymous writes, no accounts, booking, or payments.
8. Live Supabase and a Vercel preview that reads it are required before the lead manager can accept the milestone. Until then, acceptance is partial.

## Reviews required

- Security: `development/reviews/M2-security.md` (already written).
- Independent review manager: `development/reviews/M2-review.md`.

The production server for rendered checks is http://127.0.0.1:3014/. Screenshots: `/opt/cursor/artifacts/m2-home-desktop.png` and `/opt/cursor/artifacts/m2-listing.png`. Search and the narrow homepage need a browser that waits for the streamed response.

## File ownership

Frontend: `web/app/`, `web/components/`, `web/proxy.ts`.
Data: `web/lib/repository.ts`, `web/lib/supabase.ts`, `web/supabase/`.
Catalog content shared by both: `web/lib/catalog.ts`.
