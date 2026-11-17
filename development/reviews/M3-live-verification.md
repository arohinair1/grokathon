# Live preview verification — 2026-10-16

Preview: https://college-space-git-cursor-milestone-4dc157-arohi-nairs-projects.vercel.app

Commit `f1a23c9` on `cursor/milestone-3-accounts-aeea`. GitHub reported the Vercel deployment for that commit as successful. The live site matches that build: auth forms render, and callbacks redirect to that exact origin.

## What was checked from here

- `/login` and `/signup` show the forms. They do not say accounts are unavailable, so `NEXT_PUBLIC_SITE_URL` is a valid https origin.
- `/auth/callback` with `token_hash` or a bad code, and `/auth/recover` with a bad code, redirect to `https://college-space-git-cursor-milestone-4dc157-arohi-nairs-projects.vercel.app/login?error=link`. The location stays on the preview origin. `cache-control` is `private, no-store`.
- Logged-out `/account` returns 307 to `/login?next=/account` with the same cache headers.
- `GET /auth/sign-out` returns 405.
- `/login?next=//evil.example` keeps the form's next value at `/account`.
- `/catalog-health` returned `source: supabase`, 8 published listings, 8 photos, `draftVisible: false`, and no write probe.
- Homepage sent `x-catalog-source: supabase`. Kerrytown returned 200. The draft slug and an unknown slug returned 404.
- Date search for 1 Sep–1 Dec 2026, and the reversed pair, returned the same three listings. 1–2 Jan 2026 showed the empty-date state. Storage search returned the storage samples.
- Browser, synthetic address `m3-live-20261016@example.test`: signup and a repeat signup showed the same link sentence. A wrong password stayed on the login page. The correct password with `next=https://evil.example` stayed on the preview and showed the not-confirmed login error. Forgot-password showed the same link sentence. A 390px menu showed Log in, Sign up, Browse, and List a space.
- Repo checks at this commit: 67 unit tests, TypeScript, eslint, and `npm run build` passed. The build's catalog script talked to the local PostgREST shim, not the hosted project. The live `/catalog-health` is the hosted catalog check.

## What was not checked

No inbox was opened. These hosted flows are not verified:

- The confirmation email arrived.
- The link opened `/auth/callback` and created a session.
- Login, refresh, profile edit, and sign-out for a confirmed user.
- The recovery email arrived and `/auth/recover` set a new password.
- `public.profiles` exists on the hosted database, a signup created a row, and one user cannot read another.

The signup sentence is the same for success and for most Auth errors, so that screen does not prove a user or an email was created. `example.test` cannot receive mail. Supabase's built-in mailer only sends to the project's team addresses and is rate limited.

Screenshots are in `/opt/cursor/artifacts/m3-live-step*.png`.
