# M3 auth architecture

Status: implemented from the revised text. Security’s second design review required rejecting a resolved pathname that starts with `//`. That check is in `web/lib/safe-next.ts`. Sign-out is the one proxy exception: `/auth/sign-out` does not refresh a session, because a refresh can write a new cookie onto the response after the route clears it.

## Decision

Use Supabase Auth email and password, with `@supabase/ssr` on the Next.js server. One `profiles` row per `auth.users` id. The catalog keeps using the anonymous client and the existing published-only policies. No service-role key.

## Clients

- Server actions and route handlers perform every auth call. There is no browser Supabase client in this milestone, so session cookies can be `httpOnly`.
- `createServerClient` reads and writes cookies. Outside localhost, cookies are `secure`. `sameSite` is `lax`.
- `/account` and the profile update action call `auth.getUser()`. `getSession()` is not proof of identity.
- The proxy may call `getClaims()` only on the auth routes listed below. Catalog routes do not read or refresh a session.
- The catalog client in `web/lib/supabase.ts` stays anonymous.
- `getUser()` and profile reads are not wrapped in `use cache` or `unstable_cache`. `/account` is dynamic and sends `cache-control: private, no-store`.

## Site URL

`NEXT_PUBLIC_SITE_URL` must be an absolute `https` origin, or `http://localhost:3000` locally. If it is missing or invalid, login, signup, and reset say accounts are unavailable. The app never falls back to `Host`, `x-forwarded-host`, or `VERCEL_URL`.

The stable Preview origin is the site URL. Deployment-specific `*.vercel.app` hostnames are not allowlisted. A new preview hostname does not receive auth emails until someone adds it on purpose.

## Redirects

- Signup email links go to `/auth/callback` and then `/account`.
- Recovery email links go to `/auth/recover` and then `/reset-password`.
- Those two callback paths are the exact Supabase redirect URLs. They do not carry a `next` query, because an allowlist entry has to match the full URL and a `/**` wildcard is forbidden.
- The callback accepts only a PKCE `code`. It does not call `verifyOtp` with `token_hash`.
- After a successful code exchange, the server redirects to the fixed target for that callback. It does not forward `code`.
- Login and signup forms may accept a `next` path for in-app navigation after a password sign-in. One shared function decides it:
  - Read `next` from the query and decode it at most once, inside `try`/`catch`. A decode error uses `/account`.
  - Reject unless it starts with `/`.
  - Reject if it starts with `//` or contains any character from U+0000 through U+0020, U+007F, or `\`.
  - Resolve it with `new URL(next, NEXT_PUBLIC_SITE_URL)`. Reject unless that origin equals the site origin.
  - Reject if the resolved `pathname` starts with `//`.
  - Redirect to the resolved `pathname + search + hash`, never the original string.
  - Anything rejected becomes `/account`.

## Profiles

Table `public.profiles`:

- `id uuid` primary key, references `auth.users(id)` on delete cascade
- `display_name text` not null, 1–80 characters after trim
- `created_at` and `updated_at` timestamptz

No phone, address, university, birth date, avatar, or role. Authorization never reads `user_metadata` or a profile column the user can edit.

`revoke all on public.profiles from public, anon, authenticated`. Then grant `authenticated` select on `id`, `display_name`, `created_at`, and `updated_at`, and update on `display_name` only.

Policies, for `authenticated` only:

- select using `(id = auth.uid())`
- update using `(id = auth.uid())` with check `(id = auth.uid())`

No insert or delete policy. A before-update trigger sets `updated_at` and forces `id` to stay `old.id`.

A `security definer` trigger on `auth.users` uses `set search_path = ''` and schema-qualified names. It inserts the profile with `on conflict (id) do nothing` and never raises because of signup metadata. `display_name` is the submitted value trimmed and cut to 80 characters, or the fixed word `Member` when that is missing or blank. The default is not taken from the email address. The migration backfills users who already exist. Execute on the trigger functions is revoked from `public`, `anon`, and `authenticated`.

The account page reads the email from `getUser()`. A missing profile shows a plain error, not a client insert.

App validation trims display names and rejects characters U+0000–U+001F, U+007F, and the bidi overrides U+202A–U+202E, U+2066–U+2069.

## Routes

- Public: `/login`, `/signup`, `/forgot-password`, `/auth/callback`, `/auth/recover`
- Recovery session: `/reset-password`. Password updates prefer the project setting that requires the current password except for a recovery session. After a reset, other sessions are signed out.
- Protected: `/account`. The server component and the update action each call `getUser()`.
- Sign-out is POST only, uses the server client, and clears cookies.
- Catalog routes stay public and do not refresh a session. Their 404 and 503 responses stay as they are.
- `proxy.ts` refreshes the session only for `/account`, `/reset-password`, and `/auth/*`. The response `setAll` last built is what the proxy returns, including `cache-control`, `expires`, and `pragma`. Refreshed cookies are not dropped by a fresh `NextResponse.next()`.

## Supabase project settings

This milestone requires:

- Confirm email on
- Confirm phone on, even though phone sign-in is off
- Anonymous sign-ins off
- No other providers
- Minimum password length 8
- Site URL set to the stable preview origin
- Redirect URLs are the two exact callback URLs, plus `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/recover` for local work
- No `*` or `**` redirect

Signup and reset show one sentence for success, HTTP 429, and provider errors, including a mail failure. They say accounts are unavailable only when the request never receives an HTTP response. That avoids a different sentence when Auth refuses one address and accepts another. Confirmation is not turned off to make testing easier. The built-in mailer is not treated as production delivery. A paid SMTP provider is not configured without the founder's approval. Verification and recovery are not called done until a real inbox completes them.

The public Auth API can still answer differently for an unknown address and a repeat reset (including HTTP 429). The app shows one sentence for success, 429, and provider errors: "If that address can receive a link, we've sent one. If nothing arrives in a few minutes, try again later." Direct Auth API enumeration is an accepted limit for this milestone.

## Tests

- Unit tests for the `next` function: accept `/account` and `/account?tab=1`; reject `//a.example`, `/\a.example`, `/.//a.example`, `/x/..//a.example`, `/%2e//a.example`, `/%5Ca.example`, `/%2F/a.example`, `/%09/a.example`, `/%0a/a.example`, `/%0d/a.example`, `/%09%5Ca.example`, `https://a.example`, a malformed `%`, and an empty value.
- A local SQL check, with an `auth.uid()` shim that is not part of the hosted migration, asserts the privilege matrix and that user A cannot read or change user B. Insert, delete, truncate, and updates to `id` are refused. A signup with a missing, blank, or 200-character name still creates the user and a profile.
- Catalog `verify-rls.sql` still passes after the profile migration.

## Out of scope

Host tools, listing ownership, bookings, payments, OAuth, phone login, and roles.
