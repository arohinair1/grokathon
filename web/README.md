# College Space web app

Next.js App Router application for the Ann Arbor marketplace preview. See DEC-001,
DEC-002, and DEC-004. Listings are demo data. With Supabase env vars set, search and
listing pages read published rows. Without those vars, they use `web/lib/catalog.ts`.

## Commands

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

`npm run dev` serves the site at http://localhost:3000.

## Supabase

Schema, seed, and the local auth check:

```bash
# Hosted Supabase already has auth.users. Do not run auth-shim.sql there.
psql "$DATABASE_URL" -f supabase/migrations/20261014020000_catalog.sql
psql "$DATABASE_URL" -f supabase/seed.sql
psql "$DATABASE_URL" -f supabase/migrations/20261014040000_profiles.sql
psql "$DATABASE_URL" -f supabase/verify-rls.sql
```

A local Postgres without Supabase Auth can run `supabase/auth-shim.sql` before the
profile migration, then `supabase/verify-profiles.sql`. That shim is test-only.

On Supabase, run the catalog migration, the seed, and the profile migration in
the SQL editor, in that order. Then set these on the Vercel project for Preview,
and in `web/.env.local` for local dev:

- `NEXT_PUBLIC_SUPABASE_URL` — public project origin (`https://<project>.supabase.co`). A pasted `/rest/v1` suffix is ignored so the client does not request `/rest/v1/rest/v1`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` locally, or the stable Preview origin (`https://…`). Auth pages fail closed when this is missing. The app does not use `Host` or `VERCEL_URL`.

In the Supabase Auth URL settings, allow only these redirect URLs, with no `*` or `**`:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/recover`
- `https://<stable-preview-origin>/auth/callback`
- `https://<stable-preview-origin>/auth/recover`

Set the Site URL to that same preview origin. Keep email confirmation and phone
confirmation on, anonymous sign-ins off, the minimum password length at 8, and
secure password change on so a normal session cannot replace the password
without the current one. Recovery still goes through the email link.
Email links do not carry a `next` path. Signup returns to `/auth/callback`, then
`/account`. Recovery returns to `/auth/recover`, then `/reset-password`.

Do not add the service-role key. Redeploy after saving the Vercel variables, because
`NEXT_PUBLIC_` values are read at build time. Vercel Authentication stays as the
founder left it.

Search keeps a requested date range only when both ends sit inside the listing
window. A reversed pair is swapped before the query. Unlike price units are not
sorted against each other.

Catalog reads use a four-second limit and are not retried. If that check fails
before the page renders, the homepage, search, and listing routes return HTTP
503. A later query failure shows the same unavailable state and does not fall
back to the checked-in file. An empty result stays an empty result. A build
with those env vars also runs `scripts/verify-hosted-catalog.mjs`, including a
write-denial probe. `/catalog-health` repeats only the read checks.

## Vercel

The project is `college-space` on the Hobby team "Arohi Nair's projects". The root
directory is `web`. The framework preset is Next.js. The file catalog runs
without environment variables. Preview has the two public Supabase variables.
The production branch stays `main`. Do not promote the preview branch.

The Milestone 2 preview remains:

https://college-space-git-cursor-milestone-e841d6-arohi-nairs-projects.vercel.app

The Milestone 3 preview origin is:

https://college-space-git-cursor-milestone-4dc157-arohi-nairs-projects.vercel.app

Preview has `NEXT_PUBLIC_SITE_URL` set to that origin. On 2026-10-16 the login
and signup forms rendered there. If the variable is missing or not an https
origin, those pages say accounts are unavailable. The public catalog on that
preview reads hosted Supabase. Do not add each new deployment hostname to the
redirect allowlist. Confirmation and recovery emails have not been completed
on that preview.

**Reminder:** Vercel Authentication is off so this preview can be opened without a
Vercel login. When a production deployment is in place, turn it back on under
Settings → Deployment Protection. Until then, every deployment URL for this project
is public.

## What is real

With the two public Supabase variables set, search, the homepage feature row, and
listing pages read published rows. Without them, those pages read `web/lib/catalog.ts`.
Every listing is demo data. Booking requests and host tools are not implemented.
Accounts use the server Supabase client. A visitor can browse without one.
`/account` and password reset call `getUser()`; the catalog routes do not refresh
a session. When the Supabase variables are set, the listing proxy asks
whether that slug is published and returns 404 when it is not, including a slug
that exists only in the checked-in file. A lookup that does not answer returns
503. Without the variables, the proxy uses the checked-in slugs.
