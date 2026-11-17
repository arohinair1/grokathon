# Milestone 5 directory

This is an engineering record. It does not accept the milestone.

## What shipped on `cursor/milestone-5-discovery-aeea`

- `/states` and `/states/[slug]` list states and colleges that are already in the database.
- `/colleges` and the homepage search box look up a college by name.
- `/colleges/[slug]` shows the existing catalog filters and listings only when `market_status` is `active`.
- Planned and paused colleges get an explicit closed page and no listing cards.
- University of Michigan–Ann Arbor remains the only active market in the seed.

The pages work against the Milestone 4 hosted schema. Name search uses `search_colleges` when that function exists, and otherwise matches `colleges.name`. Alias search and the external institution id require the migration below.

## Source

Recommended source: NCES IPEDS Institutional Characteristics, directory information, file HD2024.

Downloaded in this session from [https://nces.ed.gov/ipeds/datacenter/data/HD2024.zip](https://nces.ed.gov/ipeds/datacenter/data/HD2024.zip). The zip contains `HD2024.csv`, dated 2025-09-21 inside the archive. The data-center index describes HD2024 as directory information for the 2024–25 collection. Fields used: `UNITID`, `INSTNM`, `CITY`, `STABBR`, `IALIAS`, `CYACTIVE`, `CLOSEDAT`, `NEWID`.

A local load of that file inserted 5,839 planned colleges and updated the existing Ann Arbor row to UNITID `170976` without changing its id, slug, name, or `active` status. `search_colleges('university of michigan', 8)` returned 3 rows in about 14 ms. The same plan on a second read is an update of those rows, not a second insert.

Measured from that file:

| Check | Count |
| --- | --- |
| Rows in HD2024.csv | 6,072 |
| `CYACTIVE = 1`, closed and merged markers not set, state is one of the 50 states or DC | 5,840 |
| States represented in that 5,840 | 51 |
| University of Michigan–Ann Arbor | UNITID `170976`, city Ann Arbor, `CYACTIVE` 1 |

Rows are skipped when `CYACTIVE` is not `1`, `CLOSEDAT` or `NEWID` is set to something other than blank or `-2`, or `STABBR` is outside the seeded state list. A separate NCES license page was not retrieved. The file is the public data-center download. Hosted use still needs approval.

College Scorecard was not used.

## Import

`web/scripts/import-colleges.ts` plans inserts and updates from HD2024. It refuses a database URL that is not `localhost` or `127.0.0.1`. New colleges are inserted as `planned`. An active college keeps its id, slug, name, city, state, and `market_status`. The first local run attaches UNITID `170976` to the existing Ann Arbor row because the slug matches.

Rerunning the script updates planned names and replaces IPEDS aliases for rows in the file. It does not delete colleges that have left the file.

## Activation

To open another college later, after product approval and with listings ready:

```sql
update public.colleges
set market_status = 'active'
where slug = 'the-college-slug'
  and market_status = 'planned';
```

There is no public control for this. Ordinary database roles cannot update `colleges`. Do not run that statement for any college other than University of Michigan–Ann Arbor unless the founder approves that market.

## Hosted approval package

Do not apply this until approved.

1. Source and version: IPEDS HD2024, zip dated 2025-09-21 in the archive, downloaded from the NCES data center.
2. Records: 5,840 inserts plus one update of the existing Ann Arbor row. One active college before and after.
3. Schema: `web/supabase/migrations/20261017060000_college_directory.sql` adds `colleges.source`, `colleges.source_id`, `college_aliases`, and the functions `search_colleges` and `directory_states`.
4. Procedure: apply that migration in the Supabase SQL editor, then run the importer from a machine that can reach the hosted database only after the script’s local-only guard is deliberately changed for that approved run. The committed script will not connect to hosted Supabase.
5. Rollback: delete `college_aliases` and colleges where `source = 'ipeds'` and `market_status = 'planned'` and the id is not referenced by `listing_colleges`. Then drop the functions, the alias table, and the two columns if a full reversal is required. Do not delete the Ann Arbor row.
6. Existing listings: the Ann Arbor id and its `listing_colleges` rows stay. Demo listings stay public. Drafts stay private.
7. New markets stay `planned`.

## Local checks still required

The import and `verify-directory.sql` are for a local database. They are not a hosted import.
