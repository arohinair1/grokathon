# Product direction

Approved by the founder on 2026-10-13. This file is the product source of truth for implementation. Research in `docs/RESEARCH.md` and `research/` is background. Do not turn an unvalidated research hypothesis into a requirement.

When this direction changes, update this file before starting new work. Agents read this file, not an older chat summary.

## What we are building

College Space is a polished two-sided consumer marketplace. Students, university visitors, and other renters discover residential parking and storage offered by local property owners.

Ann Arbor and University of Michigan-related demand come first. The architecture may later add other college towns. Do not build that expansion now.

Categories in view:

- Monthly and semester parking
- Football and event parking
- Summer and semester storage
- Graduation and university-event parking

One listing has one use. Do not build automatic switching of the same space across the calendar.

## Quality bar

The product should feel like a premium consumer marketplace: clear hierarchy, considered typography, consistent spacing, real photography, cohesive color, responsive layouts, and obvious search. Original identity. Passing a build does not prove the interface is good.

## Stack and location

- Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui
- Application code in `web/`
- Vercel, with the project root set to `web`
- Supabase Postgres for the catalog. Supabase Auth is approved for Milestone 3 only: one account, email and password, a private profile, and no host tools, bookings, or payments.
- Maps and Stripe only after a later approval

## Current operating rules

- Listings are clearly labeled as demos. Milestone 2 reads published rows from Supabase when it is configured, and uses the checked-in catalog when it is not.
- No real payments, paid reservations, or binding bookings.
- A future booking request is nonbinding until the founder approves live marketplace operations.
- Preserve existing research and project documentation.
- Build one milestone at a time. Do not start the next milestone without the founder's approval.
- Record consequential choices in `docs/DECISIONS.md`.

## Milestone 1 scope

- Next.js, TypeScript, Tailwind, and shadcn/ui in `web/`
- Visual identity and shared UI patterns
- Homepage, navigation, and footer
- Labeled Ann Arbor demo listings and a way to start looking for parking or storage
- Empty, loading, and error patterns
- Install, lint, and production build succeed
- Vercel-compatible layout
- Stack and build-first decisions recorded in `docs/DECISIONS.md`

## Milestone 2 scope

Approved by the founder on 2026-10-14. This is a public, read-only catalog.

- Published demo listings live in Postgres with row level security.
- Search and listing pages read that catalog when Supabase env vars are set.
- One inclusive availability window per listing. No booking calendar yet.
- No accounts, host tools, booking requests, or payments.
- The Milestone 1 visual system stays.

## Milestone 3 scope

Approved by the founder on 2026-10-14. This is the account foundation, not the marketplace.

- Fix the Milestone 2 catalog reliability notes before adding accounts: bounded queries, no long retry waits, a read-only health check, and an honest failure when the configured database does not answer.
- Email and password accounts through Supabase Auth, including verification and password reset when those emails can actually be delivered.
- One identity per person. No separate host and renter account types, and no role system yet.
- A private profile the owner can read and edit. Anonymous visitors can still browse published listings.
- No listing ownership, booking requests, payments, messaging, or reviews.
