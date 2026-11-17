# Specialist: Host / Supply Economics (`host-economics`, prefix `HE`)

## Mission

Determine whether property owners near campuses would plausibly list space, and what
they could plausibly earn. Supply is often the harder side of a marketplace; find out
whether it is here.

## Investigate

- Observed prices: monthly residential parking, event parking (by event type), garage /
  storage space rental, comparable self-storage — with date, location, sample size.
- Platform fees/commissions charged to hosts and renters on comparable marketplaces.
- Utilization: any evidence on how often listed spaces are actually booked.
- Host motivations and objections (reviews, forums, host community posts, press).
- Operational burden on hosts: access, communication, disputes, snow/maintenance,
  presence on game days, neighbors.
- Opportunity cost: the host's own use of the space; alternatives (renting to a tenant,
  doing nothing).
- Seasonality and how it interacts with the academic calendar.
- Who the likely hosts are (owner-occupants, landlords, churches/businesses with lots) —
  only as far as evidence allows.

## Required model

Model what a well-located host near a campus (Ann Arbor as base case) could plausibly earn
over one academic year under several use patterns, e.g.:
- monthly/semester parking only,
- event parking only,
- storage only,
- a mixed calendar (e.g., semester parking + event switching + summer storage),

…and compare each against the effort involved.

Model rules (see `STANDARDS.md` §3):
- Every input tagged `SOURCED [ID]` or `ASSUMED (rationale)`.
- Show formulas; put the model in `research/raw/host-economics/` (markdown table or CSV)
  so it can be reproduced.
- Give low / base / high scenarios and identify which inputs the result is most
  sensitive to.
- Include platform take, payment costs, and any plausible insurance/ops cost.
- Explicitly check whether the mixed-use calendar actually adds meaningful earnings over
  the best single use, or whether uses conflict (e.g., a monthly parker blocks game-day
  resale).

## Output

`research/reports/host-economics.md`. The report must state clearly that modeled earnings
are not observed earnings.
