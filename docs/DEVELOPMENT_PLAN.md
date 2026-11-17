# Development plan

How College Space is built. Product requirements are in `docs/PRODUCT_DIRECTION.md`. Live progress is in `docs/DEVELOPMENT_STATUS.md`.

## How agents actually run

Cursor project subagents are markdown files in `.cursor/agents/` with `name`, `description`, and `model`. The lead session delegates with the Task tool. Each subagent has its own context and returns a result. It does not see the parent chat unless the prompt includes it.

Verified limits:

- Files do not start agents by themselves. A session has to delegate.
- Subagents share this checkout unless the parent asks for an isolated worktree. Two writers on one file will collide. The manager assigns file ownership.
- The parent may pass a model on the Task call. That call is the assignment this session can guarantee. Frontmatter `model` is the default for later sessions.
- Model ids below are the slugs this cloud session is allowed to launch. They are not a guess at Cursor's whole catalog.
- `/in-cloud` and `/autopilot` are desktop-session features, not something this cloud run configures in the repo.

## Model tiers

| Tier | Use | Slug for this repo |
| --- | --- | --- |
| Frontier | Planning acceptance, substantial review, security, concurrency, disagreements | `claude-opus-5-5-xhigh` for independent review. `gpt-5.6-sol-xhigh` if a second frontier opinion is required. |
| Balanced | Feature implementation, design judgment, API work | `composer-2.5` for implementation. `gpt-5.6-sol-high` for design review, a different family from the reviewer. |
| Fast | Tests, docs, lint, boilerplate | `composer-2.5-fast` |

The parent session is the lead manager (Grok). Routine coordination stays here. Do not spawn a frontier model to edit a string.

Escalate after a failed retry, or when the task becomes authorization, money, or a contradiction between review and implementation. Do not retry the same failure on the fast model.

Implementation and independent review use different families: Composer or GPT for building and design, Claude Opus for the review verdict.

## Roles

| Agent file | Invokes when |
| --- | --- |
| `engineering-manager.md` | Milestone planning and acceptance. Usually the parent session. |
| `product-designer.md` | Visual direction and screenshot review before UI is accepted. |
| `frontend-engineer.md` | Next.js UI implementation. |
| `backend-engineer.md` | Supabase, SQL, auth, booking rules. Not Milestone 1. |
| `qa-engineer.md` | Test gaps and browser checks the reviewer is not already running. |
| `infrastructure-engineer.md` | Vercel, CI, env hygiene. |
| `security-reviewer.md` | Auth, RLS, payments, sensitive data. |
| `review-manager.md` | Independent verdict. Cannot be the author of the change. |

## Workflow

1. Manager writes a task in `development/tasks/` with acceptance criteria and file ownership.
2. Specialists implement only that scope.
3. Review manager reads the diff, runs the relevant checks, and returns APPROVE, APPROVE WITH NONBLOCKING ISSUES, or REVISE. UI work also gets a design review of the rendered pages.
4. REVISE goes back once for a targeted fix, then one re-review. A second failure escalates to the manager and the founder if it changes product direction.
5. Manager records acceptance in `docs/DEVELOPMENT_STATUS.md` and `development/reviews/`.
6. Milestones stop for the founder's approval.

## Milestone sequence

1. Preview shell in `web/` with demo data. Accepted.
2. Supabase read-only catalog. Accepted with nonblocking issues on 2026-10-14. Not merged.
3. Accounts. Approved on 2026-10-14. Implemented on `cursor/milestone-3-accounts-aeea`. Hosted email delivery is not verified. Do not start host tools.
4. Host listings, photos, and blocked dates.
5. Nonbinding requests, with server-side conflict rules.
6. Responsive release pass and Vercel project.

Do not start a milestone the founder has not approved. Milestone 3 is approved. Milestone 4 is not.
