# M3 phase A — catalog reliability

Status: approved with nonblocking issues in `development/reviews/M3-reliability-review.md`. A follow-up makes the listing probe select the same columns as the page, so a photo-query fault returns 503 before the listing shell. Authentication work starts after that.

## Acceptance criteria

1. A catalog read stops within about four seconds and is not retried into a much longer wait.
2. An empty database result stays empty. A failed read does not become the checked-in file catalog.
3. A failed read does not put database error text in the page.
4. If the proxy's catalog check fails, `/`, `/search`, and `/listings/:id` return HTTP 503.
5. If that check succeeds and the page query then fails, the page shows the unavailable state rather than listing cards, an empty-success state, or an error digest. HTTP 200 is acceptable here because the static shell is already committed.
6. A missing or unpublished slug still returns HTTP 404 when the database answers.
7. `/catalog-health` is read-only. It does not insert. Write denial stays in `web/scripts/verify-hosted-catalog.mjs` and `web/supabase/verify-rls.sql`.
8. Homepage, search, date filters, listing detail, and the published-only 404s still work when the database is healthy.

## Verification already run

- `npm test` in `web/`: 36 passed. The hanging-read test saw one request and failed in about 4.0 seconds.
- Local production server through a relay: a dead database returns 503 in about 4.0 seconds; an HTTP 500 returns 503 immediately; a probe that succeeds and a later page query that fails returns the unavailable copy in about 4.0 seconds when the query hangs, with no listing cards.
- `web/supabase/verify-rls.sql` passed on local `college_space` (8 published, 9 total, anon cannot see the draft, writes denied).
- Hosted preview before this branch deployed: `/catalog-health` reported 8 published, 8 photos, `draftVisible: false`, and `writeDenied: true`. `/listings/hidden-sample-draft` returned 404. That does not prove the hosted draft row exists.
