# Milestone 6 booking requests

This is an engineering record. It does not accept Milestone 3, 4, 5, or 6.

## Lifecycle

Dates are inclusive, matching listing windows and blocked dates. The earliest start is today in America/Detroit. A request may cover at most 366 inclusive days.

| From | To | Who | Rule |
| --- | --- | --- | --- |
| — | pending | Renter | Published, non-demo listing in an active market. Not the renter’s own listing. Dates fit the window and avoid blocked dates and accepted reservations. Repeating the same pending span returns the existing row. |
| pending | accepted | Host who owns the listing | Listing is locked, then the dates are checked again. Overlapping pending rows may exist. Only one can be accepted. |
| pending | declined | Host who owns the listing | No availability change. |
| pending | cancelled | Renter who created it | Hosts decline instead of cancelling. |
| accepted, declined, cancelled | — | Nobody in this milestone | Terminal. Accepted reservations are not cancelled here. |

Unpublishing a listing hides it and blocks a later accept. Existing accepted rows stay. A listing with any booking row cannot be deleted. An availability window cannot be shrunk through an accepted reservation, and a new blocked range cannot cover one.

## Pricing

A day rate times the inclusive day count is labeled an estimate. Month, semester, and event rates are shown as listed and are not prorated. The request stores the price from that moment for display. Nothing is charged. DEC-009.

## Database

`web/supabase/migrations/20261018070000_booking_requests.sql`

- Table `booking_requests`. Host identity comes from `listings.owner_id`.
- Partial unique index for one pending span per renter, listing, and dates.
- GiST exclusion constraint `booking_requests_no_accepted_overlap` on accepted rows, using `btree_gist` and an inclusive `daterange`.
- `accept_booking` locks the listing row before the status change, so a second overlapping accept waits and then fails with `booking_conflict`.
- Clients have column `SELECT` and no insert, update, or delete. RLS lets a renter read their rows and a host read rows for listings they own.
- Trigger `booking_requests_guard` rejects table writes unless the transition function set `app.booking_transition` for that write and cleared it afterward.
- `listing_reserved_spans` returns accepted dates for a public listing and no identity.
- `booking_counterparty_name` returns the listing’s public host label to the renter, and the requester’s profile display name to the owning host. It does not read the host’s profile. `service_role` cannot insert, update, delete, or truncate the table. The table owner can still write.

The migration does not depend on `20261017060000_college_directory.sql`.

Rollback, only after the founder agrees to drop request history: drop the booking triggers on `listings` and `listing_blocked_dates`, drop `booking_requests`, and drop the booking functions. Do not drop colleges or listings.

## Directory migration, still not applied

`web/supabase/migrations/20261017060000_college_directory.sql` remains safe to apply on its own when alias search and IPEDS source ids are wanted. `search_colleges` and `directory_states` are security invoker with an empty search path. Alias reads are select-only. It does not change the Ann Arbor row or `market_status`. Booking requests do not need it. The nationwide HD2024 import stays deferred. University of Michigan–Ann Arbor stays the only active market.

## Local checks in this session

On a fresh database, this order passed: auth shim, catalog, seed, profiles, host markets, college directory, booking requests, storage shim, storage policies, then `verify-rls.sql`, `verify-profiles.sql`, `verify-host.sql`, `verify-directory.sql`, `verify-storage.sql`, and `verify-bookings.sql`.

`verify-bookings.sql` also passed on a database that did not have the directory migration.

`node scripts/verify-booking-concurrency.mjs` accepted one of two overlapping requests and returned `booking_conflict` for the other. That script creates and drops `m6_concurrency`.

These are local role checks, not hosted proof.

## Hosted approval order

Do not run these until approved. If the directory migration is still waiting, skip it. Booking requests do not need it.

1. `web/supabase/migrations/20261018070000_booking_requests.sql`
2. `web/supabase/migrations/20261018070100_listing_integrity.sql`
3. Optional, separate approval: `web/supabase/migrations/20261017060000_college_directory.sql`
4. Do not import HD2024 in the same step.

`20261018070100_listing_integrity.sql` stops a published listing from losing its private address or its active primary college, including through `host_set_listing_facts`. It also caps blocked ranges at 48 per listing. Date search calls `listing_ids_blocked_between`, which returns one row per listing, and treats a 1,000-row fallback as a catalog failure.

Until the booking migration is applied, the preview can show the request form and will say that requests are not available yet.
