# College Space — Yale

Storage and parking for life around Yale. Students describe what they need. SpaceMatch asks Grok to read that request, then College Space filters a fictional New Haven sample catalog and explains the listings that actually matched.

Sample listings, hosts, and prices are illustrative. Nothing here collects payment. College Space is not a Yale University service. The earlier College Space milestones remain in this repository’s history.

## Built with Grok

Hackathon development in Cursor used Grok. SpaceMatch calls the xAI API from the server (`grok-4.7` unless `XAI_MODEL` is set) to extract requirements and explain matches. Listing facts, availability, and prices come from the sample catalog. Grok does not create listings.

The project owner will add their own screenshot of Grok in Cursor at `docs/grok-in-cursor.png`. This repository does not include a stand-in image.

## Run the demo

```bash
cd web
npm install
npm test
npm run dev
```

Open `/find`. Without `XAI_API_KEY`, SpaceMatch says so and uses a labeled local parser. It does not describe that parser as Grok. With the key set only on the server, the same page calls the xAI API. `XAI_MODEL` defaults to `grok-4.7`. `XAI_API_BASE_URL` defaults to `https://api.x.ai/v1`. Do not put the key in `NEXT_PUBLIC_` variables or in Git.

# college-space (working name)

Early-stage startup project. We are **testing** — not assuming — the hypothesis that a
marketplace focused on college towns, where property owners monetize underutilized
residential space (driveways, garages, carports, other appropriate parking/storage), can
serve demand that recurs on a predictable university calendar (semester parking, summer
storage, move-in/out, game days, graduation, etc.).

**Nothing in this hypothesis has been validated.** The research phase is designed to try
to disprove or modify it.

## Current phase

The founder approved a testable product preview (DEC-001, DEC-002). Application code is
in `web/`. Research files remain background; `docs/RESEARCH.md` has no conclusions.
See `research/STATUS.md` for the research workflow, which is no longer a gate on building.

## Where things live

| Path | What it is | Authority |
|---|---|---|
| `research/raw/` | Raw evidence, notes, source captures | Intermediate — never product truth |
| `research/reports/` | Specialist agent reports | Intermediate — unreviewed until a review says otherwise |
| `research/reviews/` | Manager critiques of reports | Process record |
| `docs/RESEARCH.md` | Manager-reviewed research synthesis | Reviewed conclusions |
| `docs/PRODUCT_SPEC.md` | Product decisions derived from validated research | Product truth |
| `docs/MVP.md` | Narrow initial experiment/product scope | Product truth |
| `docs/DESIGN.md` | UX and design principles/workflows | Product truth |
| `docs/DECISIONS.md` | Consequential decisions and their rationale | Decision log |
| `app/`, `tests/`, `deploy/` | Code, tests, deployment config | Not started |

Start with `AGENTS.md` (any agent) or `CLAUDE.md` (Claude Code). The research process is
described in `research/README.md`.
