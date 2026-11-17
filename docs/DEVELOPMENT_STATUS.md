# Development status

Working state for the engineering workflow. Not a research conclusion and not a product spec.

## Current milestone

**Milestone 6 — booking requests, in progress.** Branch `cursor/milestone-6-bookings-aeea`, stacked on Milestone 5. Renters can request dates and hosts can accept or decline. Accepted dates cannot overlap. No payments. Not accepted. See DEC-009 and `development/reviews/M6-bookings.md`. Do not apply `web/supabase/migrations/20261018070000_booking_requests.sql` or `web/supabase/migrations/20261018070100_listing_integrity.sql` to the hosted project without approval.

**Milestone 5 — college discovery, not accepted.** Branch `cursor/milestone-5-discovery-aeea`. The founder reported that the preview for `d04f475` loaded, college search opened University of Michigan–Ann Arbor, and listing word search behaved for a real word and an empty result. The directory migration and the nationwide import are still not applied. See DEC-008.

**Milestone 3 — accounts, not accepted.** The founder verified signup, confirmation, login, session persistence, sign-out, display-name save, and that an ordinary login does not show the new-password form. Hosted two-user profile isolation is still open. Do not send another recovery email unless the founder asks. See `development/reviews/M3-remaining.md`.

**Milestone 4 — host listings, not accepted.** The founder created `Test Driveway Parking — Ann Arbor`, confirmed the draft stayed out of public search, uploaded a photo, added blocked dates, published, saw it in the catalog, and unpublished it. It must stay unpublished. Hosted cross-user listing and photo checks are still open. See `development/reviews/M4-remaining.md`.

## Phase

Do not merge to `main` and do not promote to production. Milestone 6 is in progress on `cursor/milestone-6-bookings-aeea`. Do not apply `web/supabase/migrations/20261017060000_college_directory.sql`, the IPEDS import, or `web/supabase/migrations/20261018070000_booking_requests.sql` to the hosted project without approval.

## Reminder

When a production deployment is in place, turn **Vercel Authentication** back on: college-space → Settings → Deployment Protection. The founder turned it off on 2026-10-14 so the Milestone 1 preview could be viewed. While it is off, every deployment URL for the project is public.

## Decisions

- DEC-001 and DEC-002: build the preview, app lives in `web/`.
- DEC-003: this development workflow.
- DEC-004: public read-only catalog.
- DEC-005: one Supabase Auth identity and a private profile.
- DEC-006: host listings and a college directory that does not launch a market by itself.
- DEC-007: hosted college seed and owner ids stay narrow.
- DEC-008: college discovery reads the directory and does not launch markets.
- DEC-009: booking requests reserve dates and do not collect payment.

## Blockers

The hosted draft row has not been counted with a privileged query. Anonymous checks cannot tell a hidden draft from a missing one. See `development/reviews/M3-draft-verification.md`.

The Milestone 3 preview is https://college-space-git-cursor-milestone-4dc157-arohi-nairs-projects.vercel.app. On 2026-10-16 the login and signup forms rendered, so `NEXT_PUBLIC_SITE_URL` is set. The hosted catalog health check still reports eight published listings, eight photos, and a hidden draft.

Hosted email confirmation and password-recovery mail are not verified. The built-in mailer is not production delivery. Do not turn confirmation off. A paid SMTP provider is not configured.

The founder reports the profile migration was applied. This environment has not queried hosted `public.profiles`. Do not run `web/supabase/auth-shim.sql` on the hosted project.

## Outstanding

- Founder: open a confirmation email and a recovery email in the same browser that requested them, then run the SQL in `development/reviews/M3-acceptance.md`
- Confirm phone confirmation is on and anonymous sign-ins are off
- Security review of the account code: APPROVE WITH NONBLOCKING ISSUES (`development/reviews/M3-auth-security.md`)
- Live review: APPROVE WITH NONBLOCKING ISSUES for observed behavior only (`development/reviews/M3-acceptance.md`)
- Turn Vercel Authentication back on when a production deployment is in place
- Nonblocking notes in `development/reviews/M2-preview.md`
- Milestone 4 proceeds on `cursor/milestone-4-host-listings-aeea` and does not merge to `main`

## Model log

| When | Task | Model | Why |
| --- | --- | --- | --- |
| 2026-10-13 | Lead coordination of Milestone 1 workflow | Parent session (Grok) | Orchestration, not a new implementation |
| 2026-10-13 | Design review of rendered Milestone 1 | `gpt-5.6-sol-high` | APPROVE WITH NONBLOCKING ISSUES |
| 2026-10-13 | Independent review of Milestone 1 | `claude-opus-5-5-xhigh` | APPROVE WITH NONBLOCKING ISSUES. Ran test, lint, and build. |
| 2026-10-14 | Vercel preview preparation | `composer-2.5` | Lint, test, and production build passed. Deploy blocked on account linking. |
| 2026-10-14 | Public Vercel preview review | `claude-opus-5-5-xhigh` | APPROVE WITH NONBLOCKING ISSUES. Preview URL is public. |
| 2026-10-14 | Milestone 2 RLS review | `claude-opus-5-5-xhigh` | APPROVE WITH NONBLOCKING ISSUES. Local Postgres and a PostgREST check. |
| 2026-10-14 | Milestone 2 independent review | `claude-opus-5-5-xhigh` | First verdict REVISE (photos and unpublished HTTP status). Re-review APPROVE WITH NONBLOCKING ISSUES. |
| 2026-10-14 | Milestone 2 browser checks | `composer-2.5` | Homepage, search, empty state, listing, and 404 at desktop and 390px. |
| 2026-10-14 | Milestone 2 deployed preview review | `claude-opus-5-5-xhigh` | APPROVE WITH NONBLOCKING ISSUES. Checked the hosted catalog, preview pages, and a local outage. |
| 2026-10-14 | Catalog reliability review | `claude-opus-5-5-high` | APPROVE WITH NONBLOCKING ISSUES. `xhigh` was unavailable. |
| 2026-10-14 | Auth design review | `claude-opus-5-5-xhigh` | REVISE, then REVISE on one redirect case. The required pathname check is in the implementation. |
| 2026-10-14 | Account pages in the browser | `composer-2.5` | Local synthetic auth. Login, profile edit, signup copy, recovery, and a 390px menu. |
| 2026-10-16 | Live preview auth check | `composer-2.5` | Signup sentence, bad login, open redirect, catalog, and a 390px menu on the preview. |
| 2026-10-16 | Live milestone review | `claude-opus-5-5-xhigh` | APPROVE WITH NONBLOCKING ISSUES for observed behavior. Email and hosted profile RLS still unverified. |
