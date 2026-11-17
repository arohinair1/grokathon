# M3 security review: auth architecture (design)

## Re-review of the revised architecture

Re-review verdict: REVISE

Reviewer: security reviewer (`.cursor/agents/security-reviewer.md`). I did not write the revision, I edited no application code, and I implemented no authentication. This file is the only repo file I changed, and it is not committed.
Date: 2026-10-14.

Reviewed: `development/tasks/M3-auth-architecture.md`, status "revised after `development/reviews/M3-auth-design.md` (REVISE)". It is still untracked on `cursor/milestone-3-accounts-aeea` (head `3204ed1`). No auth code exists yet. Outside `node_modules` and `.next`, `rg` for `getUser`, `getSession`, `getClaims`, `createServerClient`, `NEXT_PUBLIC_SITE_URL`, `service_role`, and `sb_secret` matches only the task file, the reviews, and the `listing-access.test.ts` assertion.

Three of the four blocking items are fixed. The fourth, the `next` rule, still allows an open redirect. The hole is in the rule I wrote in the first review, which the revision copied word for word. My first payload set had no dot segments, so I missed it.

### Blocking items against the new text

| First-review blocking item | Where the revision addresses it | Result |
|---|---|---|
| 1. Replace the `next` rule | Redirects, "One shared function decides it" | **Still blocking.** Dot segments get through. See below |
| 2. The trigger cannot fail a signup | Profiles, the `security definer` trigger paragraph | Fixed. It matches the required text, and adds the backfill and the `EXECUTE` revoke |
| 3. Pin the Supabase Auth settings | "Supabase project settings" | Fixed. Every setting I asked for is listed, and turning confirmation off is forbidden |
| 4. Bound the proxy refresh and carry the cache headers | Clients, the `getClaims()` bullet; Routes, the catalog and `proxy.ts` bullets | Fixed, using the preferred option. Catalog routes don't refresh. The proxy returns the response `setAll` last built, with its three cache headers |

I reran the trigger prototype with metadata that isn't blank: tab-only, bidi, control-character, numeric, object, and JSON `null` names. Every signup still created both rows (`m3-auth-rereview-profiles.log`).

### Remaining blocking change: reject a resolved path that starts with `//`

The rule checks for `//` before parsing, but parsing removes dot segments afterward. `/.//a.example` starts with one `/` and contains no control character or `\`. It resolves on the site origin, so the origin check passes. Its resolved `pathname` is `//a.example`, and the rule returns that pathname as the redirect target. `//a.example` is a protocol-relative link to another host. `/x/..//a.example` and `/%2e//a.example` behave the same way, because URL parsers treat `%2e` as `.` (`m3-auth-rereview-next-dots.log`).

I ran the design's function as written in the scratch Next.js 16.4.0 app, with the logging stand-in attacker on `127.0.0.1:4999`:

| Redirect method | Result for `next=/.//127.0.0.1:4999/...` |
|---|---|
| `NextResponse.redirect(new URL(target, SITE))` | `Location: http://127.0.0.1:4999/...` |
| `redirect(target)` from `next/navigation`, in a route handler | `Location: //127.0.0.1:4999/...` |
| A login server action calling `redirect(target)`, form posted without JavaScript | `303`, `Location: //127.0.0.1:4999/...` |
| The same server action, submitted by React in Chrome | Chrome loaded the attacker page |
| `` NextResponse.redirect(`${SITE}${target}`) `` | Stayed on the site |

For the route handlers and the Chrome run, the attacker server logged each request. For the no-JavaScript post, the `Location` header shows the target, because curl did not follow the redirect (`m3-auth-rereview-next-sinks.log`, `m3-auth-rereview-next-server-action.log`). The server-action rows matter most, because the revision sends every sign-in through a server action.

In the Redirects section, after "Reject unless that origin equals the site origin.", add:

> - Reject if the resolved `pathname` starts with `//`.

In Tests, add `/.//a.example`, `/x/..//a.example`, and `/%2e//a.example` to the values that must be rejected.

With that one check added, all 24 unit cases pass. They include the 13 cases the design already requires (2 accepts and 11 rejects), the dot-segment cases, and normal paths such as `/a/../account` (`m3-auth-rereview-next-fixed-unit.log`). I then ran 30 redirects: three route-handler methods with seven payloads each, four no-JavaScript action posts, and five Chrome loads covering the `redirect()` route, the client router, and the server action. All of them stayed on the site, the attacker server received 0 requests, and `/account?tab=1` still redirected normally (`m3-auth-rereview-next-fixed-sinks.log`).

The check is enough by itself. For an `http` or `https` URL, the parser's `pathname` always starts with `/`. It never contains a raw backslash, tab, or newline. So a leading `//` is the only way the returned target can name another host.

### Nonblocking items that were required during implementation

| First-review item | Revised design | Result |
|---|---|---|
| Revoke default grants (nonblocking 1) | `revoke all on public.profiles from public, anon, authenticated`, column grants, a privilege-matrix check, and a test-only `auth.uid()` shim | In the design |
| Server actions and `httpOnly` cookies (nonblocking 4) | "Server actions and route handlers perform every auth call... session cookies can be `httpOnly`" | Partly. See note 1 |
| PKCE-only callbacks (nonblocking 5) | "The callback accepts only a PKCE `code`. It does not call `verifyOtp` with `token_hash`." | In the design. There are now two callbacks, so it should say "both callbacks" |
| Fixed email targets (nonblocking 5) | Signup goes to `/auth/callback` then `/account`, recovery to `/auth/recover` then `/reset-password`, with no `next` | In the design |
| POST sign-out (nonblocking 6) | "Sign-out is POST only, uses the server client, and clears cookies." | In the design |
| Fail-closed site URL (nonblocking 7) | The Site URL section | In the design. It omits the first review's line that `/account` must not treat a visitor as signed in when the Supabase env vars are absent |
| Action-level `getUser()` and no caching (nonblocking 8) | Clients, and Routes, Protected | In the design |

### Nonblocking notes on the revision

1. **Make `httpOnly` a requirement.** "Can be" leaves the `@supabase/ssr` 0.12.7 default in place, and that default is `httpOnly: false` (`utils/constants.js`). `createServerClient` spreads `cookieOptions` over the default (`cookies.js` lines 223–230 and 463–470). The text should say every `createServerClient` passes `cookieOptions` with `httpOnly: true`, and `secure: true` outside localhost. That also covers the PKCE code-verifier cookie.
2. **The display-name rule lives only in the app.** The trigger stored tab-only, bidi, and control-character names. User A also set their own name to a bidi string with a trailing tab through a direct update, which is the Data API path the `update (display_name)` grant allows (`m3-auth-rereview-profiles.log`). Only the owner sees the name in this milestone. Before Milestone 4 shows names to other users, put the rule in a database check. The trigger must then fall back to `Member` for any value the check would reject. I added that check without changing the trigger, and a tab-only signup failed with `23514`. That is the signup oracle from blocking item 2 coming back. The signup test should include a tab-only name and a bidi name.
3. **`/reset-password` should require a recovery session, not "prefer" one.** The Auth server asks for the current password only when `UpdatePasswordRequireCurrentPassword` is on, and it skips that check for recovery sessions (`user.go` lines 173–176). Without the setting, anyone holding a session can set a new password. With "other sessions are signed out", they then lock the owner out. Either list the setting as required under "Supabase project settings", or have the reset action refuse a session that isn't a recovery session.
4. **Apply the cache headers in every `setAll`, not only in the proxy.** That means the `/auth/callback` and `/auth/recover` handlers and the sign-in and sign-out actions as well. The risk is low, because the callback URL carries a one-time `code` and the actions are POSTs. Applying the headers everywhere is Supabase's guidance and costs nothing.
5. **Record the Auth settings as acceptance evidence**, for example a dashboard screenshot or Management API output. The first review asked for this, and the revision dropped it. Without it, nobody notices when a setting drifts.
6. **`/login`, `/signup`, and `/forgot-password` are not in the proxy refresh list.** Either they don't read the session, or they join the list. A Server Component that refreshes a session can't write the new cookies, so the next request reuses the old refresh token.
7. **Test gaps.** Add a session with no `sub` claim, which should see 0 rows, and assert `relrowsecurity` on `public.profiles`. The design lists policies but never says RLS is enabled. The A-versus-B test would catch that, but the check costs one line.
8. **Accepted limit: the signup oracle still exists at the Auth API.** The Auth server copies `options.data` into `raw_user_meta_data` unchanged (`signup.go` line 358). A NUL character in it fails the `jsonb` cast with `22P05` before any trigger runs (`m3-auth-rereview-profiles.log`). From the source, I infer that a new address gets HTTP 500 and a confirmed address returns early. I did not run the Auth server. This falls under the design's "Direct Auth API enumeration is an accepted limit"; the trigger can't close it. Bot protection on signup is still the later fix.

### How I re-tested

All logs and scripts are in `/opt/cursor/artifacts/`. The new scripts are `m3-auth-scripts/next-rule-dots.mjs`, `next-rule-fixed.mjs`, `rereview_profiles.sql`, and `nextapp-action/`.

- **`next` rule.** I ran the design's function in Node 22 against dot-segment payloads. In the scratch Next.js 16.4.0 app, `/tmp/m3sec/nextapp`, I tested three route-handler methods. I also added a server-action login stand-in that renders `next` into a hidden field and calls `redirect()`. It was driven by multipart posts from curl and by headless Chrome, with React submitting the form. I then added the one check and reran everything.
- **Profiles.** I ran the probes in one transaction, rolled back, in the throwaway `safetrig` database. That is the fallback-trigger prototype with the same grants and policies as the revision. Signups were simulated as `supabase_auth_admin` inserts, not through a real Auth server.
- **Cookie and password settings.** I read `@supabase/ssr` 0.12.7 (`/tmp/m3sec/ssr`) and the Auth server's `user.go` and `signup.go` excerpts.

### Left running

- tmux `m3sec-next-probe`: the scratch app on port 3999. It now uses the fixed rule and has the `/action` page.
- tmux `m3sec-evil`: the attacker stand-in on `127.0.0.1:4999`.
- The Postgres cluster at `/tmp/m3sec/pg`, unchanged, because the probes rolled back.

---

## First review

Verdict: REVISE

Reviewer: security reviewer (`.cursor/agents/security-reviewer.md`). I did not write this design, I edited no application code, and I implemented no authentication. This file is the only repo file I changed, and it is not committed.
Date: 2026-10-14.

## What was reviewed

- `development/tasks/M3-auth-architecture.md`, status "proposed". It is untracked in the working tree on `cursor/milestone-3-accounts-aeea` (head `3204ed1`). No auth code exists: outside `node_modules`, `rg` for `getUser`, `getSession`, `SITE_URL`, `service_role`, and `sb_secret` matches only this task file, earlier reviews, and the `listing-access.test.ts` assertion that requests do not contain `service_role`.
- Context: `docs/PRODUCT_DIRECTION.md` (Milestone 3), `docs/QUALITY_STANDARDS.md`, `web/supabase/migrations/20261014020000_catalog.sql`, `web/supabase/verify-rls.sql`, `web/proxy.ts`, `web/lib/supabase.ts`, `web/lib/listing-access.ts`, `web/lib/repository.ts`.
- What the design relies on: the installed `@supabase/supabase-js` and `@supabase/auth-js` 2.117.3, and `@supabase/ssr` 0.12.7. That is the current npm release; it is not installed in `web/`, so I unpacked it in `/tmp`. Also the Supabase Auth server source at `supabase/auth@ce9a8ee` (master, 2026-09-22), and two Supabase docs pages accessed 2026-10-14: [Next.js server-side auth](https://supabase.com/docs/guides/auth/server-side/nextjs) and [managing user data](https://supabase.com/docs/guides/auth/managing-user-data).

Not reviewed: the hosted Supabase project's settings (no dashboard access or service key here), or a running Supabase Auth server. Statements about Auth server behavior come from reading its source. I did not run it.

## Summary

Most of the design is right and should stay:

- Identity comes from `getUser()`, not `getSession()`.
- The catalog stays on the anonymous client.
- A database trigger creates the profile, so no service-role key is needed.
- Profile RLS is owner-only, with column grants.
- The account page reads the email from `getUser()`.
- Redirect URLs are exact, with no wildcard.
- Email links are built from a configured origin, not from `Host`.

I built the profile schema as described in a Supabase-like Postgres. It holds every ownership property, and the catalog RLS check still passes alongside it.

Four parts are not safe to implement as written:

1. The `next` rule allows an open redirect. It accepts a tab or newline, which browsers strip. Three of the four common Next.js redirect methods I tested sent the browser to another host.
2. The design doesn't say where the trigger gets `display_name`. The usual implementation makes signups fail, which lets anyone holding the public anon key test whether an address has an account.
3. The design's same-copy promise and its email verification depend on Supabase settings it doesn't name. One of them is easy to switch off by mistake.
4. The proxy plan copies cookies without the cache headers that keep one user's session out of another user's response. It also puts an unbounded Auth call in front of the catalog's 4-second 503.

## Required checks

| Concern | Result |
|---|---|
| Session trust: identity from `getUser()`, never `getSession()` | Pass |
| Open redirects | **Fail**. Blocking 1 |
| Wildcard redirect URLs | Pass. Exact entries only; deployment-specific `*.vercel.app` URLs are not allowlisted |
| Profile RLS: owner reads and updates own row; no insert, delete, or `id` change | Pass in the prototype |
| Anon access to profiles | Pass, as long as Supabase's default grants are revoked. Nonblocking 1 |
| Impersonation | Pass for row ownership. **Fail** for cached `Set-Cookie` responses. Blocking 4 |
| Email enumeration | **Fail**. Blocking 2 and 3 |
| Service-role exposure | Pass. The design needs no service-role key, and none is in the repo |
| Catalog policy regressions | Pass. `verify-rls.sql` passes with the profiles migration applied, and the anon catalog client is unchanged |
| Catalog 404 and 503 under session refresh | **Fail**. Blocking 4 |

## Blocking changes

### 1. Replace the `next` rule

The rule accepts a `next` whose decoded value is `/`, then a tab, then `/evil.example`. It starts with a single `/`, does not start with `//` or `/\`, and contains no `://`. URL parsers remove ASCII tab, LF, and CR before parsing, so the value becomes `//evil.example`, a link to another host. Node and Chrome 154 both resolve it to `https://evil.example/` (`m3-auth-next-rule.log`, `m3-auth-next-rule-chrome.log`).

I tested the literal rule in a scratch Next.js 16.4.0 app, with a local server standing in for the attacker:

| Redirect method | Result with the tab payload |
|---|---|
| `NextResponse.redirect(new URL(next, SITE))` | `Location: http://127.0.0.1:4999/...`, the attacker host |
| `redirect(next)` from `next/navigation` | `Location: /<TAB>/127.0.0.1:4999/...`. Chrome followed it to the attacker server |
| `router.replace(next)` in a client component, like a browser-side `signInWithPassword` success handler | Chrome went to the attacker server |
| `` NextResponse.redirect(`${SITE}${next}`) `` | Stayed on the site |

The attacker server's log shows each hit (`m3-auth-next-redirect-sinks.log`, `m3-auth-next-redirect-chrome.log`). The attack is a link to the real `/login` with this `next`. After a genuine sign-in, the user lands on a page that can ask for the password again.

Replace the `next` bullet with:

- `next` is read from `searchParams` and decoded at most once more, inside `try`/`catch`. A decode error means the default.
- It is rejected unless it starts with `/`. It is also rejected if it starts with `//` or contains any character from U+0000 to U+0020, U+007F, or `\` anywhere.
- The remaining value is resolved with `new URL(next, NEXT_PUBLIC_SITE_URL)`. It is rejected unless the resolved origin equals the site origin.
- The redirect target is the resolved URL's `pathname + search + hash`, never the input string.
- A rejected value becomes `/account`. One shared function serves `/login`, `/signup`, `/auth/callback`, and any client-side redirect.
- `/auth/callback` redirects to `next` only after a successful code exchange, and never forwards `code`.

Required unit tests:

- Accept: `/account` and `/account?tab=1`.
- Reject: `//a.example`, `/\a.example`, `/%5Ca.example`, `/%2F/a.example`, `/%09/a.example`, `/%0a/a.example`, `/%0d/a.example`, `/%09%5Ca.example`, `https://a.example`, a malformed `%`, and an empty value.

I ran this rule in the same scratch app. All 18 combinations of redirect method and payload stayed on the site, the attacker server received 0 requests, and normal paths still redirected (`m3-auth-next-redirect-fixed.log`). The `://` check can stay, but it is not what makes the rule safe.

### 2. Define the trigger so it cannot fail a signup

The design makes `display_name` `not null` with 1–80 characters, and says a trigger inserts the profile. It does not say where the name comes from. Supabase's documented trigger reads `raw_user_meta_data`, which any caller sets through `signUp({ options: { data } })`. I built it that way (`m3-auth-profiles-design.log`). A signup with no `display_name`, an empty one, or a 200-character one failed the whole `auth.users` insert, with Postgres errors `23502` and `23514`.

The Auth server turns a failed insert into HTTP 500 "Database error saving new user" (`internal/api/signup.go` line 386). It only inserts for a new address. For an address that is already registered and confirmed, it returns before the insert (lines 194–195 and 281–300).

So anyone holding the public anon key can call `/auth/v1/signup` with `data: {}`. A 500 means no account exists, and a 200 means the address is registered. No email reaches the target. If the app's own signup form doesn't send a display name, every signup fails. Supabase's docs warn that a failing trigger "could block signups".

Replace the trigger sentence with:

> A `security definer` trigger on `auth.users`, with `set search_path = ''` and schema-qualified names, inserts the profile with `on conflict (id) do nothing`. It never raises because of signup metadata. `display_name` is the submitted value trimmed and cut to 80 characters, or a fixed default such as `Member` when that is missing or blank. The default is not derived from the email address.

Required test: a signup as the Auth role with a missing, empty, whitespace-only, or 200-character `display_name` creates both rows. I tested that fallback. All four signups succeeded, and the full profile RLS suite still passed (`m3-auth-profiles-variants.log`).

### 3. Pin the Supabase Auth settings the design depends on

The design promises the same copy for unknown and existing addresses, and that verification is real. Both depend on project settings the design doesn't name.

- The auth-js 2.117.3 `signUp` docs (`GoTrueClient.d.ts` lines 295–297) and the Auth server (`signup.go` lines 293–294) agree on one point. If **Confirm email** or **Confirm phone** is off, even with phone sign-in disabled, `signUp` for a registered address returns 422 `User already registered`.
- With Confirm email off, signup also returns a session for an address nobody has proved they own. Someone could hold a classmate's address before the classmate signs up.
- The product direction ties verification to email that "can actually be delivered". The design rules out paid SMTP without approval. When mail fails, turning confirmation off is the obvious shortcut, so the design has to forbid it.

Add a settings section:

> Supabase Auth for this milestone has Confirm email on, Confirm phone on (even though phone sign-in is off), anonymous sign-ins off, and no other providers. The Site URL is the stable preview origin. Redirect URLs are exact, with no `*` or `**`. If email can't be delivered, signup and reset say accounts are unavailable; confirmation is not turned off. The implementer records these settings as acceptance evidence.

Two notes on that text:

- Anonymous sign-ins issue `authenticated` sessions that pass `getUser()`. Through the trigger, each one would also create a profile.
- The Auth server accepts any redirect with the Site URL's scheme, host, and port, whatever the path or query (`internal/utilities/request.go` lines 106–113). On our origin, the Site URL scopes redirects, not the `/auth/callback` entry.

### 4. Bound the proxy refresh and carry the cache headers

I checked this against the current `proxy.ts` and the installed auth-js.

**Cache headers.** When a refresh writes cookies, `@supabase/ssr` 0.12.7 passes three headers to `setAll` (`cookies.js` lines 505–509):

- `Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`
- `Expires: 0`
- `Pragma: no-cache`

Supabase's Next.js guide says these must go on the response, because a cached response that carries `Set-Cookie` signs the next visitor in as someone else. The design copies only cookies.

The catalog 404 sends no `Cache-Control` today. I confirmed that against the local build on port 3053. A 404 carrying a refreshed session could therefore be cached. I did not see Vercel cache one, but leaking a session through a cached cookie is an impersonation bug, so the rule belongs in the design.

**Unbounded wait.** The refresh runs when a signed-in visitor's access token has expired. That is the normal state for anyone returning after an hour. I timed `getUser()` with an expired session (`m3-auth-refresh-timing.log`):

| Auth server state | Time for `getUser()` |
|---|---|
| Returns 503 | 25.4 s, 8 attempts |
| Refuses the connection | 25.4 s |
| Hangs | No answer after 45 s |
| Hangs, with a 1.5 s fetch timeout per request | 23.1 s, 7 attempts |

A per-request timeout doesn't help, because auth-js retries timed-out refreshes with backoff for up to 30 s (`GoTrueClient.js` lines 4030–4046). If the proxy waits for this before its catalog check, an Auth outage turns the catalog's accepted 4-second 503 into a 25-second wait or a platform timeout for signed-in visitors. That undoes the bound accepted in Milestone 3 phase A (criteria 1 and 4). Anonymous visitors are unaffected: with no cookie, `getUser()` returns at once and makes no request.

Replace the `proxy.ts` bullet with one of these two options.

- **Preferred:** catalog pages don't read the session in Milestone 3. The proxy doesn't refresh on `/`, `/search`, or `/listings/:id`, and those 404 and 503 responses are unchanged. The proxy refreshes on `/account`, `/reset-password`, and `/auth/*`.
- **Or:** on catalog routes the refresh has one overall deadline, enforced by racing the whole `getUser()` or `getClaims()` call. A per-request timeout alone is not enough. On deadline or error, the request continues anonymously, the catalog decision doesn't change, and the existing auth cookies are left alone.

Under either option, every response the proxy returns carries the cookies and the `cache-control`, `expires`, and `pragma` headers from the last `setAll`. That includes the continue response, the 404, and the 503.

## Nonblocking issues

Ordered by how much I would want each fixed during implementation.

1. **Revoke Supabase's default grants, and test privileges as well as behavior.** "Anon has no privileges" and "users cannot insert or delete" are the right end state. But Supabase grants `ALL` on new `public` tables to `anon` and `authenticated`, and RLS does not apply to `TRUNCATE`. With RLS and policies but no `revoke`, anon truncated every profile in my prototype (`m3-auth-profiles-variants.log`). Supabase's own profile example also grants anon `SELECT`, so don't copy it.

   The migration needs `revoke all on public.profiles from public, anon, authenticated`. Then grant `authenticated` column privileges only: select on the columns `/account` reads, and update on `display_name`. My prototype granted select on `id`, `display_name`, and the timestamps. The check script should assert the privilege matrix the way `verify-rls.sql` does for the catalog. It should also cover the behavior cases in `m3-auth-scripts/test_profiles.sql`:
   - A sees only A's row, and an update aimed at B changes 0 rows.
   - Insert, upsert, delete, truncate, and updates to `id` or `created_at` are refused.
   - A session with no `sub` claim sees 0 rows.

   Keep a local `auth` shim (roles, `auth.users`, `auth.uid()`) in a test-only file. A migration containing `create or replace function auth.uid()` must never reach the hosted project.
2. **The proxy continue path and matcher will sign users out.** `continueWithSource()` builds a fresh `NextResponse.next()`, which drops refreshed cookies. Supabase's guide says to return the response `setAll` last built, or to copy its cookies and headers onto `NextResponse.next({ request })`. That way Server Components see the new token and don't refresh it a second time; a second refresh triggers reuse detection, which revokes the session.

   The matcher today is only `/`, `/search`, and `/listings/:id`. It must cover `/account` and `/reset-password`, and the refresh must run before the early `NextResponse.next()` return. Server Components can't write cookies, so without the proxy the refreshed token is lost.

   `getClaims()` is acceptable in the proxy. With asymmetric signing keys it verifies locally, which couples catalog routes less to the Auth server. Keep `getUser()` for `/account`.
3. **The public Auth API can still reveal accounts, and the app's copy must cover 429.** Anyone can call the Auth API directly with the anon key. For an unknown address, `/recover` returns 200 at once (`recover.go` lines 52–56). For a known address, it sends mail, and a repeat request inside `SMTP.MaxFrequency` returns 429 `over_email_send_rate_limit` (`mail.go` lines 402–404 and 724–726). Response timing differs for the same reason.

   The app should show the same copy for success, 429, and provider errors on both forms, worded honestly, for example: "If that address can receive a link, we've sent one. If nothing arrives in a few minutes, try again later." Record the API-level risk as accepted for this milestone. Bot protection on signup and recovery is the later fix.
4. **Session cookies are readable by page scripts.** `@supabase/ssr` 0.12.7 defaults to `httpOnly: false`, `sameSite: lax`, a 400-day max age, and no `secure` flag. Any XSS on the origin can therefore read the refresh token.

   The design says `createBrowserClient` is for "form submissions that Supabase expects in the browser" but doesn't name which forms. Prefer server actions and route handlers for every auth call, so cookies can be `httpOnly`. If the browser client stays, list its forms in the design, and set `secure: true` outside localhost.

   One tradeoff I did not verify: server-side calls reach Supabase from Vercel's IP addresses, so check how that interacts with Supabase's per-IP auth limits.
5. **Callback and email-link details.** The callback should accept only `code` (PKCE). Don't add a `token_hash` plus `verifyOtp` path without a user click: it allows login CSRF, and a mail scanner that follows links could use up the one-time token.

   Carrying `next` through email links is fragile. Allowlist entries are matched as globs on the full URL including the query (`request.go` lines 128–135). An exact `http://localhost:3000/auth/callback` entry won't match `...?next=...`, and the obvious fix, `/**`, is the wildcard the design forbids. Use fixed targets instead: signup goes to `/account`, and recovery goes to `/reset-password` through its own exact callback path. The Auth server always accepts loopback IP addresses (`request.go` lines 121–122).

   From the source, PKCE does not protect a flow the attacker starts. `resetPasswordForEmail` stores the caller's code challenge (`recover.go` line 60), so whoever receives the code can exchange it. The exact allowlist and Site URL are what keep the code away from an attacker. Don't add hosts the team doesn't control.
6. **Password reset and sign-out.** `/reset-password` accepts any session, not only a recovery session. The Auth server can enforce the distinction. With `UpdatePasswordRequireCurrentPassword` enabled, a password change needs the current password unless the session is a recovery session (`user.go` lines 173–176). I did not check what the dashboard calls this setting.

   After a reset, sign out other sessions with `scope: 'others'`. Set the project's minimum password length to 8, because the public API enforces the project value, not the app's.

   The design has no sign-out route. It should be POST only, use the server client, and clear the cookies.
7. **`NEXT_PUBLIC_SITE_URL` must fail closed.** Validate it as an absolute https origin, or `http://localhost:3000` locally. If it is missing or invalid, the auth pages say accounts are unavailable. Never fall back to `Host`, `x-forwarded-host`, or `VERCEL_URL`. When Supabase env vars are absent and the site uses the checked-in catalog, `/account` must not treat the visitor as signed in.
8. **Authorization at the action level, and no caching.** A server action that updates `display_name` calls `getUser()` itself, because the page-level redirect doesn't protect a POST to the action. RLS backs this up. Don't wrap `getUser()` or the profile read in `'use cache'` or `unstable_cache`. `/account` stays dynamic and `private, no-store`.
9. **Display names and metadata.** A whitespace-only name passes the 1–80 check (`m3-auth-profiles-design.log`). Trim names, and reject control and bidirectional-override characters, before Milestone 4 shows names to other users. `user_metadata` is writable by the user through `updateUser({ data })`, so never base authorization on it or on any profile column the user can update.
10. **Hygiene.** In my simulation of Supabase's default privileges, anon received `EXECUTE` on the trigger functions. Trigger functions can't be called directly; I got `0A000` when I tried. Still, revoke `EXECUTE` or move the functions to a schema the API doesn't expose. Users created before the migration have no profile and can't insert one by design, so backfill them in the migration or handle a missing row on `/account`.

## How I tested

All logs and scripts are in `/opt/cursor/artifacts/`. Scripts are in `m3-auth-scripts/`, and the Auth server and `@supabase/ssr` source excerpts I cite are in `m3-auth-scripts/sources/`.

- **`next` rule.** The literal rule and the proposed rule ran in Node 22 against 13 payloads, and in Chrome 154 (`m3-auth-next-rule.log`, `m3-auth-next-rule-chrome.log`). A scratch Next.js 16.4.0 app in `/tmp/m3sec/nextapp`, using `web/node_modules` and outside the repo, tested four redirect methods against a logging attacker server on `127.0.0.1:4999`. That covered curl for the server-side methods and headless Chrome for `redirect()` and `router.replace()`. I then swapped in the proposed rule and reran (`m3-auth-next-redirect-*.log`).
- **Profile schema.** I used a throwaway Postgres 16 cluster on socket `/tmp/m3sec/pg/sock`, port 55491. It had Supabase-like roles (`anon`, `authenticated`, `service_role`, `supabase_auth_admin`, `authenticator`), an `auth.users` table, Supabase's `auth.uid()` body, and Supabase's default `GRANT ALL` privileges. I applied the catalog migration, the seed, and the design's profiles schema, ran `web/supabase/verify-rls.sql` (exit 0), and ran `test_profiles.sql` (`m3-auth-profiles-design.log`). I repeated it with no `revoke`, and with the fallback trigger (`m3-auth-profiles-variants.log`). Signups were simulated as `supabase_auth_admin` inserts into `auth.users`, not through a real Auth server.
- **Refresh timing.** The installed supabase-js 2.117.3 `getUser()` ran with an expired session against fake Auth servers that returned 503, hung, or refused connections, with and without a 1.5 s per-request timeout (`m3-auth-refresh-timing.log`). This is the auth-js code that `@supabase/ssr` wraps.
- **Catalog 404 headers.** I sent `curl` to `http://localhost:3053/listings/not-a-listing`, the existing local build. It returned 404 with `content-type`, `x-catalog-source`, and `x-robots-tag`, but no `cache-control`.

## Left running

So the probes can be rerun:

- tmux `m3sec-next-probe`: the scratch Next app on port 3999, now using the proposed rule.
- tmux `m3sec-evil`: the logging stand-in attacker server on `127.0.0.1:4999`.
- The Postgres cluster at `/tmp/m3sec/pg`, which holds only the throwaway databases `design`, `norevoke`, and `safetrig`.

None of them touches `college_space` or the hosted project.
