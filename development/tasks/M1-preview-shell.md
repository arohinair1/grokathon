# M1 — Preview shell

Status: implementation exists; design review and independent review in progress.
Owner: lead manager. Implementation files are already in `web/` from the earlier Milestone 1 commit. Reviewers do not edit those files.

## Product direction

`docs/PRODUCT_DIRECTION.md`, Milestone 1 scope. DEC-001, DEC-002.

## Acceptance criteria

1. `web/` is a Next.js App Router app with TypeScript, Tailwind, and shadcn/ui.
2. Homepage, header, and footer explain College Space and offer a search entry.
3. Demo listings are labeled and can be filtered by category, neighborhood, and dates.
4. A listing page shows the sample space and states that requests are not open and nothing is charged.
5. Empty, loading, and error patterns exist and are used.
6. `npm test --prefix web`, `npm run lint --prefix web`, and `npm run build --prefix web` pass.
7. No Supabase client, payment code, or binding reservation.
8. Research files are preserved. Decisions are in `docs/DECISIONS.md`.
9. The interface is a coherent marketplace, usable at desktop and about 390px wide, not a generic dashboard.

## Reviews required

- Product designer, rendered UI: `development/reviews/M1-design.md`
- Independent review manager: `development/reviews/M1-review.md`

QA is not a separate run. The review manager runs the test, lint, and build commands.
Security review is out of scope. This milestone has no auth or database.

## File ownership for a revision

If the verdict is REVISE, the frontend engineer may edit files under `web/components/`, `web/app/`, and `web/lib/catalog.ts` only.
