# AGENTS.md

Orientation for any agent (Codex, Claude, or other) entering this repository. Assume you
have **no access to prior conversation history** — everything you need should be in the
repo. If something you need is not written down, treat it as undecided.

## 1. What this project is

An early-stage startup exploring a marketplace, initially focused on college towns, where
property owners monetize underutilized residential space (driveways, garages, carports,
other appropriate parking/storage) for university-driven demand (semester parking, summer
storage, move-in/out, game days, graduation, etc.).

This is a **hypothesis under test**, not an established fact. Do not write code, specs, or
copy that presumes it is true unless `docs/` says it has been validated.

## 2. Repository structure

```
docs/                 Reviewed, authoritative documents (see §3)
research/
  README.md           How the research system works
  STANDARDS.md        Evidence labels, sourcing, citation rules
  STATUS.md           Manager's working state (phase, hypotheses, questions, contradictions)
  agents/             Instructions for the manager and specialist research agents
  templates/          Templates for raw notes, reports, reviews
  raw/<agent>/        Raw evidence and notes            (intermediate)
  reports/<agent>.md  Specialist reports                 (intermediate)
  reviews/            Manager critiques of reports       (process record)
app/                  Application code (not started; no stack chosen)
tests/                Tests (not started)
deploy/               Deployment configuration (not started)
```

## 3. Source-of-truth hierarchy

From least to most authoritative:

1. `research/raw/` — anything goes, as long as it is sourced. **Never** cite raw notes as a
   conclusion.
2. `research/reports/` — one specialist's view. May be wrong, incomplete, or contradicted
   by another report. Check `research/reviews/` for its review status.
3. `docs/RESEARCH.md` — the manager's reviewed synthesis. This is the only place research
   becomes a *conclusion*.
4. `docs/PRODUCT_SPEC.md`, `docs/MVP.md`, `docs/DESIGN.md` — product truth. Every
   requirement should trace to a finding in `docs/RESEARCH.md` or an entry in
   `docs/DECISIONS.md`.
5. `docs/DECISIONS.md` — the record of *why* consequential choices were made.

Rules:
- Information flows **upward only through review**. A raw note or report never becomes a
  requirement directly.
- If a doc in `docs/` conflicts with a report, the doc wins until it is deliberately
  revised (with a decision record if consequential).
- If code conflicts with `docs/PRODUCT_SPEC.md` or `docs/MVP.md`, flag it; don't silently
  change either one to match the other.

## 4. Research standards (summary)

Full rules: `research/STANDARDS.md`. Every substantive claim is labeled:

- **FACT** — directly supported by credible, cited evidence.
- **INFERENCE** — evidence-backed inference: reasonably supported by multiple cited pieces
  of evidence but not directly established.
- **HYPOTHESIS** — a proposition we intend to test.
- **SPECULATION** — insufficient evidence.

Claims carry source IDs that resolve to URLs with access dates. Fabricated sources,
numbers, or quotes are the most serious possible error in this repo.

## 5. Scope discipline

- Product scope stays **intentionally narrow** until evidence supports expansion.
- Unvalidated startup assumptions must not silently become requirements, defaults, data
  models, or UI copy. If you need to assume something to make progress, label it as an
  assumption in code comments / PR descriptions and note it in the relevant doc.
- "College-focused branding" is not, by itself, a differentiator.

## 6. Development conventions

The product stack is recorded in DEC-002: a Next.js app in `web/`, deployed on Vercel
with that directory as the project root. Supabase is planned and not set up yet. Do not
start payments, live bookings, or a second application in `app/`. Research rules in this
file still govern research files. Product scope changes still need `docs/DECISIONS.md`.

Product requirements for the build are in `docs/PRODUCT_DIRECTION.md`. The engineering
workflow (DEC-003) is in `docs/DEVELOPMENT_PLAN.md`, with status in
`docs/DEVELOPMENT_STATUS.md` and subagents in `.cursor/agents/`.

Once code exists:
- Keep changes small and focused; one concern per commit/PR.
- Application code in `app/`, tests in `tests/` (or co-located if the chosen stack's
  convention requires it — record that choice in `docs/DECISIONS.md`).
- Never commit secrets, credentials, `.env` files, or personal data. Use example env files.
- Prefer boring, well-understood dependencies. Justify new dependencies in the PR.
- Payments, identity, access codes, and personal data are high-risk areas: changes there
  require tests and explicit review.

## 7. Testing expectations

- New behavior ships with tests. Bug fixes ship with a regression test.
- Marketplace-critical logic (pricing, fees, payouts, availability/calendar logic,
  booking conflicts, cancellations/refunds, access control) requires unit tests covering
  edge cases (timezones, overlapping bookings, semester/event boundaries).
- Tests must run from a single documented command (to be defined in `tests/README.md` when
  a stack exists).
- Do not mark work done if tests fail; report the failure.

## 8. Intermediate vs. reviewed artifacts

| Intermediate (may be wrong) | Reviewed (authoritative) |
|---|---|
| `research/raw/**` | `docs/RESEARCH.md` |
| `research/reports/**` | `docs/PRODUCT_SPEC.md` |
| `research/STATUS.md` (working state) | `docs/MVP.md` |
| `research/reviews/**` (critiques, not conclusions) | `docs/DESIGN.md` |
| | `docs/DECISIONS.md` |

## 9. Do not change without justification

- `research/STANDARDS.md` (evidence rules) — changes affect every agent.
- The source-of-truth hierarchy (this file §3, `CLAUDE.md`, `research/README.md`).
- Accepted entries in `docs/DECISIONS.md` — supersede with a new entry; never rewrite
  history.
- `docs/RESEARCH.md` conclusions — only via the manager review process or with an
  explicit, recorded reason.
- Scope in `docs/MVP.md` — expansion requires evidence and a decision record.
- Never delete raw evidence that a report or `docs/RESEARCH.md` cites.

## 10. Recording consequential changes

A change is consequential if it alters product scope, target users/markets, pricing or
fee model, trust/insurance approach, data model fundamentals, tech stack, hosting, or
anything costly to reverse. For those:

1. Add an entry to `docs/DECISIONS.md` using the format in that file.
2. Update the affected doc(s) in `docs/` and reference the decision ID.
3. If a decision depends on research, cite the `docs/RESEARCH.md` section, not a raw note.

Non-consequential changes (typos, refactors, test additions) need no decision record.
