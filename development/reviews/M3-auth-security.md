# Account implementation security review

Reviewer: independent security pass, `claude-opus-5-5-xhigh`. The reviewer did not write the implementation.

## Verdict

APPROVE WITH NONBLOCKING ISSUES, after a REVISE on sign-out.

The first pass found one blocker: `signOut()` could return without clearing the browser session when an expired access token could not be refreshed. The route now ignores that result, stops accepting later cookie writes, and expires every `sb-…-auth-token` cookie, including chunks and code verifiers. A four-second deadline keeps the response inside a short serverless limit. The re-review approved that behavior. The deadline was added after the re-review, from the reviewer’s note that a 25-second refresh retry can outlive a Vercel function.

## Still open

- `/reset-password` accepts any signed-in session. The hosted project should turn on secure password change. Recovery still uses the email link.
- The database does not reject control or bidi characters in `display_name`. The app does. Add a database check before a later milestone shows names to other people.
- `verify-profiles.sql` does not simulate Supabase’s default grants.
- Signup redirects when Auth returns a session. That depends on email confirmation staying on.
- Hosted email was not sent. The checks used a stand-in Auth server.

## Evidence

Logs from the reviewer are under `/opt/cursor/artifacts/m3-impl-sec-*.log`. Local browser checks are in `development/reviews/M3-local-auth.md`.
