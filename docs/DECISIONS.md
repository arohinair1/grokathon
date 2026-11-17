# Decisions

Lightweight log of **consequential** product and technical decisions — ones that affect
scope, target market, business model, trust/insurance approach, data model fundamentals,
stack, hosting, or anything costly to reverse. Routine choices don't belong here.

Rules:
- Append only. To change a decision, add a new entry that supersedes the old one and set
  the old entry's status to `Superseded by DEC-NNN`.
- Evidence should cite `docs/RESEARCH.md` sections (not raw notes) where research applies.
- If there is no evidence and the decision is a judgment call, say so.

## Template

```markdown
### DEC-NNN: <short title>
- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Superseded by DEC-NNN
- **Decided by:** <person / role>
- **Decision:** <what we decided, one or two sentences>
- **Rationale:** <why>
- **Evidence:** <RESEARCH.md § refs, data, or "judgment call — no direct evidence">
- **Alternatives considered:** <option — why not chosen>
- **Revisit if:** <specific, observable conditions that should reopen this>
```

## Log

### DEC-001: Build a testable Ann Arbor marketplace before research synthesis
- **Date:** 2026-10-13
- **Status:** Accepted
- **Decided by:** Founder
- **Decision:** College Space will be built now as a testable, nonbinding marketplace preview for Ann Arbor. Completing the research-agent workflow is no longer a gate. Research files stay in the repository as background and are not product requirements.
- **Rationale:** The founder redirected the project from research completion to product development, with demo data and no live payments until a later approval.
- **Evidence:** Judgment call — founder direction on 2026-10-13. `docs/RESEARCH.md` still has no conclusions. The research reports described in later handoffs are not in this repository.
- **Alternatives considered:** Finish the red-team review and synthesis before any product code — set aside by the founder for this phase.
- **Revisit if:** The founder pauses product work and returns to the research workflow, or asks to treat a research finding as a requirement.

### DEC-002: Next.js app in `web/`, Vercel, Supabase later
- **Date:** 2026-10-13
- **Status:** Accepted
- **Decided by:** Founder
- **Decision:** The application lives in `web/` as a Next.js App Router project with TypeScript, Tailwind CSS, and shadcn/ui. Vercel deploys with its root directory set to `web`. Supabase will provide Postgres and authentication in a later milestone. Milestone 1 uses local demo data only. Maps and Stripe are out of scope until approved.
- **Rationale:** The existing `app/` directory is a research placeholder, not a router. A `web/` app keeps that file and the research tree intact while giving Next.js its own `app/` routes. One listing has one category; there is no automatic switching between uses.
- **Evidence:** Judgment call — founder chose the stack and approved Milestone 1 on 2026-10-13. See DEC-001.
- **Alternatives considered:** Put the Next.js router in the repository-root `app/` directory — rejected because it would mix the product with the existing placeholder and research layout. Finish a database-backed catalog in Milestone 1 — rejected so the visual system can ship before Supabase exists.
- **Revisit if:** Hosting moves off Vercel, the data layer is not Supabase, or the founder wants a single package at the repository root.

### DEC-003: Multi-agent development workflow
- **Date:** 2026-10-13
- **Status:** Accepted
- **Decided by:** Founder
- **Decision:** Development uses a lead manager, specialist subagents, and an independent reviewer. Product requirements live in `docs/PRODUCT_DIRECTION.md`. Subagent definitions live in `.cursor/agents/`. Model tier and the Cursor limits of that setup are in `docs/DEVELOPMENT_PLAN.md`.
- **Rationale:** The founder wants specialists to build, a separate reviewer to challenge, and the manager to accept work, with stronger models on reviews and cheaper models on routine code.
- **Evidence:** Judgment call — founder direction on 2026-10-13. Cursor documents project subagents in `.cursor/agents/` and per-subagent model ids. This session's allowed ids are listed in the development plan.
- **Alternatives considered:** A custom orchestration service — rejected because Cursor already delegates through the Task tool. One model for every role — rejected because review and implementation should not share a family by default.
- **Revisit if:** Cursor removes project subagents, or the allowed model ids in this environment change enough that the tier table is wrong.

### DEC-004: Public read-only catalog in Supabase
- **Date:** 2026-10-14
- **Status:** Accepted
- **Decided by:** Founder
- **Decision:** Milestone 2 stores the demo catalog in Postgres. Anonymous clients may select published listings and their photos. They cannot write. Draft rows are hidden. Prices are integer cents. Each listing has one category and one inclusive date window. There is no street address, host contact, or auth in this milestone. The browser uses the anon key only; the service-role key is not part of the app. Until a Supabase project is connected, the site keeps using the checked-in catalog.
- **Rationale:** The founder approved a database-backed catalog and asked for safe anonymous reads. A second availability table would not change the current search behavior.
- **Evidence:** Judgment call — founder direction on 2026-10-14. DEC-002 expected Supabase after Milestone 1.
- **Alternatives considered:** Keep the catalog in a TypeScript file — rejected for Milestone 2. Add booking conflict tables now — rejected as unused. Put the service-role key in the Next.js server for reads — rejected because the anon key plus RLS is the public boundary.
- **Revisit if:** Hosts can publish listings, or search needs more than one availability window per listing.

### DEC-005: One Supabase Auth identity and a private profile
- **Date:** 2026-10-14
- **Status:** Accepted
- **Decided by:** Founder, recorded by the lead engineering manager
- **Decision:** Milestone 3 uses Supabase email and password auth through `@supabase/ssr` on the server. There is one account, not separate host and renter types. `public.profiles` holds a display name and timestamps, is readable and updatable only by its owner, and is created by a trigger on `auth.users`. The catalog stays anonymous and published-only. No service-role key, OAuth, phone login, or role column.
- **Rationale:** The founder asked for an identity foundation before hosting, booking, or payments. Server-only auth calls let the session cookie be `httpOnly`. Email links use two fixed callback paths so the Supabase redirect allowlist does not need a wildcard.
- **Evidence:** Judgment call — founder direction on 2026-10-14. Design notes are in `development/tasks/M3-auth-architecture.md`.
- **Alternatives considered:** A browser Supabase client — rejected because it would keep the session cookie readable by scripts. Separate host and renter accounts — rejected by the founder. Turning off email confirmation so signup can be tested without mail — rejected because it makes duplicate signups reveal that an address is registered.
- **Revisit if:** The founder approves a mail provider, an OAuth provider, or host ownership of listings.

### DEC-006: One account can host, and a college directory is not a launch
- **Date:** 2026-10-16
- **Status:** Accepted
- **Decided by:** Lead engineering manager, from the founder’s Milestone 4 direction
- **Decision:** A signed-in person can create listings. There is no separate host account. `listings.owner_id` references `auth.users`, and existing demo rows stay unowned. Street addresses and access notes live in `listing_private`, which anonymous clients cannot read. `states`, `colleges`, and `listing_colleges` support a later State → College → Listings directory. A college can be `planned`, `active`, or `paused`. Only University of Michigan–Ann Arbor is active. A host listing is publicly readable only when it is published and its primary college is active. Demo listings stay public. One listing can link to more than one college, with a single primary. Blocked dates are inclusive calendar dates, not bookings.
- **Rationale:** The founder asked for host tools and a nationwide-ready directory without launching other markets or inventing their listings.
- **Evidence:** Judgment call — founder direction on 2026-10-16. DEC-004 and DEC-005.
- **Alternatives considered:** One college column on each listing — rejected because one space can matter to more than one campus. Seeding a national college list now — rejected until a source and an import are approved. Putting the street address on the public listing row — rejected because Milestone 2 kept addresses off the public catalog.
- **Revisit if:** The founder activates another college market or approves a national institution import.

### DEC-007: Hosted college seed and owner ids stay narrow
- **Date:** 2026-10-16
- **Status:** Accepted
- **Decided by:** Lead engineering manager, from the founder’s pre-approval review of the Milestone 4 SQL
- **Decision:** The hosted migration seeds only University of Michigan–Ann Arbor as an active college. Colleges used to prove shared names and planned markets exist only in the rolled-back local test. Authenticated clients may insert `listings.owner_id` and cannot select it. A host finds their listings through `host_listing_ids()` and `listing_is_host_owned(target)`. Public catalog responses do not include `owner_id`.
- **Rationale:** The founder asked to keep fixture colleges off the hosted project and to avoid exposing Supabase Auth user ids in client-visible listing rows. Dashboard and editor queries still need a way to select only the caller’s listings.
- **Evidence:** Judgment call — founder review on 2026-10-16. DEC-006.
- **Alternatives considered:** Leaving `select (owner_id)` granted to `authenticated` — rejected because PostgREST would return the id for every listing that user can read, including other people’s published listings. Filtering dashboard queries with `.eq("owner_id")` without that grant — rejected because PostgREST requires SELECT on a filtered column.
- **Revisit if:** A public page needs to show which account owns a listing, or the founder approves another seeded college.

### DEC-008: College discovery reads the directory and does not launch markets
- **Date:** 2026-10-17
- **Status:** Accepted
- **Decided by:** Lead engineering manager, from the founder’s Milestone 5 direction
- **Decision:** Public pages can browse states, search colleges by name, and open a college page. `/states` lists only states that have at least one college. `/colleges/[slug]` shows listings only when that college’s `market_status` is `active`. Planned and paused colleges show a coming-soon or paused page and no listings. University of Michigan–Ann Arbor stays the only active market. Nationwide institutions may be imported from IPEDS HD2024 by the local script `web/scripts/import-colleges.ts`, which refuses a non-local database URL. New rows are `planned`. An active row keeps its id, slug, name, city, state, and market status. The hosted project does not receive that import, or `web/supabase/migrations/20261017060000_college_directory.sql`, until the founder approves both.
- **Rationale:** The founder asked for State → College → Listings discovery and a repeatable institution import without activating other markets or writing thousands of colleges into the hosted database.
- **Evidence:** Judgment call — founder direction on 2026-10-17. DEC-006 and DEC-007. The HD2024 file was downloaded from `https://nces.ed.gov/ipeds/datacenter/data/HD2024.zip` and inspected locally; counts are in `development/reviews/M5-directory.md`.
- **Alternatives considered:** Hardcoding colleges in the interface — rejected because the database is the source of truth. Importing HD2024 into hosted Supabase during this milestone — rejected until the founder approves the record count and the migration. A separate search service — rejected because Postgres text search is enough for this directory.
- **Revisit if:** The founder approves the hosted migration and import, or activates another college.

### DEC-009: Booking requests reserve dates and do not collect payment
- **Date:** 2026-10-18
- **Status:** Accepted
- **Decided by:** Lead engineering manager, from the founder’s Milestone 6 direction
- **Decision:** A signed-in renter can request inclusive dates on a published, non-demo listing in an active market, and cannot request their own listing. Pending requests may overlap. PostgreSQL allows only one accepted reservation on overlapping dates, rechecked under a listing lock at acceptance. The renter can cancel a pending request. The host can accept or decline a pending request. Accepted, declined, and cancelled rows are terminal in this milestone: neither party can cancel an accepted reservation until a later policy is approved. “Today” is the America/Detroit calendar date. A day rate is shown as an estimate of price times inclusive days. Month, semester, and event rates are not prorated. No payment is collected. The renter sees the listing’s public host label, not the host’s profile name. The host sees the requester’s profile display name, because that person sent the request. The request row includes `renter_id` so the renter’s page can be filtered; the app does not display that id. The hosted booking migration is not applied until the founder approves it.
- **Rationale:** The founder asked for a request-to-book workflow without payments, with database-enforced availability and a conservative cancellation rule where the policy was unspecified.
- **Evidence:** Judgment call — founder direction on 2026-10-18. DEC-006. The older development plan listed nonbinding requests as its fifth step; this entry follows the founder’s Milestone 6 numbering.
- **Alternatives considered:** Letting either party cancel an accepted reservation — deferred because it needs a notice and refund rule this milestone does not have. Prorating month and semester prices — rejected because the founder said not to invent proration. A separate host application — rejected because requests belong on the existing `/host` pages.
- **Revisit if:** The founder approves cancellation of accepted reservations, a payment provider, or booking email.

### DEC-010: Yale Grokathon demo uses a separate sample catalog
- **Date:** 2026-11-17
- **Status:** Accepted
- **Decided by:** Lead engineering manager, from the founder’s Yale Grokathon direction
- **Decision:** The hackathon-facing site shows a fictional Yale / New Haven sample catalog and a Grok-backed SpaceMatch flow. The checked-in Ann Arbor catalog, college directory code, and original Git history stay in place. Yale listings are not written to the existing hosted marketplace database. Sample booking requests stay in the browser. `XAI_API_KEY` is read only on the server.
- **Rationale:** The founder asked for a Yale-native demo without changing the existing hosted market or presenting fictional inventory as bookable.
- **Evidence:** Judgment call — founder direction on 2026-11-17. DEC-001 and DEC-009.
- **Alternatives considered:** Renaming the Ann Arbor college row — rejected because that market is a different record. Connecting the demo to the existing hosted database — rejected because that database is the earlier marketplace.
- **Revisit if:** The founder approves a real New Haven market or a separate hosted demo database.
