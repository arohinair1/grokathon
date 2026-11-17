# Milestone 5 proposal — nationwide college discovery

This is a proposal. It is not an approved milestone, and it is not a product requirement.

## What Milestone 4 already leaves in place

- `states` and `colleges`, with `market_status` of `planned`, `active`, or `paused`.
- `listing_colleges`, so one physical space can relate to more than one college and still have one primary.
- Public read rules that show a host listing only when it is published and its primary college is active.
- University of Michigan–Ann Arbor as the only active market.
- Host forms that list active colleges only.

Activating a later market is a data change: set that college to `active`. It should not require a new listing form. Empty or planned colleges must not be presented as open marketplaces.

## Proposed product scope

1. A state directory and a college directory.
2. Navigation of State → College → listings.
3. College name search, backed by Postgres text search or a prefix index. No separate search cluster.
4. A college listing page that reuses the current search filters.
5. An admin or reviewed way to set `market_status`. Not a public control.
6. An import of U.S. institutions from a real directory, after the source and the license are accepted.
7. Canonical URLs such as `/states/mi` and `/colleges/university-of-michigan-ann-arbor`.
8. A coming-soon state for colleges that exist in the directory and are not active.
9. Counts of listings and, later, demand by college. No earnings estimates.

Out of scope until a later decision: bookings, payments, payouts, and messaging.

## Institution data

Do not type a national list by hand.

The U.S. Department of Education’s IPEDS (Integrated Postsecondary Education Data System) is the source to evaluate first. NCES publishes institutional characteristics, including a stable `UNITID`, institution name, city, and state. The public entry point is [https://nces.ed.gov/ipeds/](https://nces.ed.gov/ipeds/).

Before an import, check the current data-use terms, how often the files are revised, how closed and merged institutions are marked, and whether campus-level rows are separate from the parent institution. IPEDS is broader than this product’s market: it includes institutions that are not places where a student needs a driveway or a garage. Importing a row must not set `market_status` to `active`.

College Scorecard can be a cross-check for names and locations. It is not required for Milestone 5 if IPEDS is sufficient.

## Rollout

Phase 1 stays University of Michigan–Ann Arbor. Use it to learn whether hosts will publish and whether people search.

Phase 2 is a few additional colleges chosen from evidence, not from the size of the directory.

Phase 3 adds states only where there is an operational reason.

Phase 4 is broader coverage where the earlier phases still hold.

Adding a college row does not create a marketplace.

## Suggested build order

1. Public read of states and active colleges, with planned colleges hidden or clearly marked coming soon.
2. Routes and indexes for state and college pages.
3. Search by college id, using `listing_colleges` and the existing listing query.
4. Name autocomplete against `colleges.name`, with the state in the result so duplicate names are distinct.
5. A reviewed import script that upserts by `UNITID` stored on `colleges`, and never activates a market.
6. Activation control and a check that a newly active college with no listings shows an empty state, not fake supply.

## Not in this proposal

Do not import the directory, do not activate another college, and do not build the Milestone 5 pages as part of Milestone 4.
