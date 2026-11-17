# Research System

Multi-agent research workspace. A **manager** agent plans and reviews; **specialist**
agents investigate; a **red-team** agent attacks the results; the manager synthesizes into
`docs/RESEARCH.md`.

Purpose of the research: **try to disprove or modify** the project hypothesis (see
`docs/RESEARCH.md` §1), not to collect support for it.

## Files

| Path | Written by | Purpose |
|---|---|---|
| `STANDARDS.md` | humans (stable) | Evidence labels, sourcing, citation rules. Binding on all agents. |
| `STATUS.md` | manager | Current phase, hypothesis register, research questions, review log, contradictions. Durable state for resuming. |
| `agents/README.md` | humans (stable) | Protocol shared by every specialist agent. |
| `agents/manager.md` | humans (stable) | The orchestration process. |
| `agents/<specialist>.md` | humans (stable) | Mission and scope for each specialist. |
| `templates/` | humans (stable) | Raw-notes, report, and review templates. |
| `raw/<agent>/` | specialist | Evidence captures, notes, calculations. Intermediate. |
| `reports/<agent>.md` | specialist | The specialist's report. Intermediate. |
| `reviews/<agent>-rN.md` | manager | Manager's critique of report revision N, with verdict and follow-up requests. |

## Specialists

| Slug | File | Source-ID prefix |
|---|---|---|
| competitive | `agents/competitive.md` | `CL` |
| markets | `agents/markets.md` | `MK` |
| demand | `agents/demand.md` (student/renter pain points) | `PP` |
| host-economics | `agents/host-economics.md` | `HE` |
| trust-ops | `agents/trust-ops.md` (trust/operations/regulation) | `TO` |
| product-ux | `agents/product-ux.md` | `UX` |
| red-team | `agents/red-team.md` (runs last) | `RT` |

## Lifecycle of a claim

```
source on the web
  → raw/<agent>/…md        (captured with URL + access date, source ID assigned)
  → reports/<agent>.md     (labeled claim citing source IDs)
  → reviews/<agent>-rN.md  (manager checks sourcing, labels, gaps, contradictions)
  → docs/RESEARCH.md       (only claims that survive review; with confidence)
  → docs/PRODUCT_SPEC.md / MVP.md  (only via an explicit, human-approved product decision)
```

Nothing skips a step.

## Phases (detail in `agents/manager.md`)

0. Orient → 1. Plan research questions → 2. Wave 1: six specialists in parallel →
3. Review → 4. Targeted follow-ups (loop) → 5. Red team → 6. Review red team + follow-ups →
7. Synthesis into `docs/RESEARCH.md` → 8. Hand back to human.
