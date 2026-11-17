# M1 — Vercel preview

Status: preview is public. Vercel Authentication is off until a production deployment. Review: `development/reviews/M1-vercel-preview.md`.
Owner: infrastructure engineer for preparation. Independent reviewer after a preview URL exists.

## Product direction

`docs/PRODUCT_DIRECTION.md`. Founder approved a Vercel preview of Milestone 1 on 2026-10-14. Do not start Milestone 2. Do not merge to `main`. Do not promote this branch to production.

## Scope

- Repository: `arohinair1/college-space`
- Branch: `cursor/milestone-1-shell-aeea`
- Commit: `a08dbc9b4ce4453625a58d56e7d16429f7f85272`
- Vercel root directory: `web`
- Framework preset: Next.js
- No environment variables
- No Supabase, authentication, payments, or visual changes

## Acceptance criteria

1. `npm test --prefix web`, `npm run lint --prefix web`, and `npm run build --prefix web` pass on this commit.
2. A Vercel Preview deployment of this branch is publicly reachable.
3. Homepage, search, and a listing detail page load, including images.
4. Demo listings stay labeled. No control presents booking or payment as operational.
5. `web/README.md` records the preview URL and the root-directory setting.
6. Production branch stays `main`.

## File ownership

Infrastructure engineer may edit `web/README.md` and `docs/DEVELOPMENT_STATUS.md` after a real preview URL exists. Do not edit `web/app`, `web/components`, or `web/lib` for this task.
