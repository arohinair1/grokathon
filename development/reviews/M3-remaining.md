# Milestone 3 remaining checks

Milestone 3 is not accepted.

## Already reported by the founder

Signup, email confirmation, login, session persistence, profile persistence, sign-out, and the account redirect were verified on the hosted project before this milestone. This pass did not repeat those.

## Code and automated coverage on this branch

The display-name helper keeps a successful save on screen and keeps a failed edit instead of restoring the previous name. `web/lib/auth/recovery.test.ts` covers that helper and the rule that an ordinary session cookie is not a recovery cookie.

`cs-recovery` is set only in the recovery code exchange, with `maxAge` of one hour, `httpOnly`, `sameSite: lax`, and `secure` in production. Sign-out clears it. A normal login does not set it. `/reset-password` redirects away unless that cookie is present.

`web/supabase/verify-profiles.sql` remains the local two-user profile check. Re-run it on a local database; it is not a hosted proof.

## Pending manual tests

Do not send another recovery email until the mailer limit has reset.

1. On the current preview, edit the display name, save, and confirm the new name stays in the field. Then submit an invalid name and confirm the typed value remains.
2. Sign in normally and open `/reset-password`. The page should refuse the password form.
3. After a real recovery email, open the link in the same browser, set a new password, and confirm `/reset-password` is closed on the next ordinary visit. Sign out and confirm the recovery cookie is gone.
4. With two hosted users, confirm each account page shows only that user’s profile. The SQL for that check is still the one in `development/reviews/M3-acceptance.md`.

## Not claimed

Hosted display-name behavior, hosted recovery delivery, and hosted cross-user profile isolation were not exercised from this environment.
