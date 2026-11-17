# Milestone 3 acceptance

Date: 2026-10-16

Independent review of the live preview: **APPROVE WITH NONBLOCKING ISSUES** for the behavior that could be observed. This is not full acceptance of Milestone 3.

The earlier code review in `development/reviews/M3-auth-security.md` still stands. Nothing new in the deployed sign-out, redirect, or catalog behavior is a blocking defect.

## Lead decision

The founder verified the hosted preview on 2026-10-16: signup, confirmation email, confirmation, login, session refresh, `/account`, display-name persistence in Supabase, sign-out, and the login redirect after sign-out. The founder’s SQL checks showed eight published listings, one draft, profiles RLS with the two owner policies, the profile trigger, and zero auth users without a profile.

A display-name form bug remains fixed only in this branch, not on the deployed preview: after Save the field snapped back until a manual refresh, even though the database had the new name. The action now returns the saved name, revalidates `/account`, and the form remounts on that name. `web/lib/auth/recovery.test.ts` covers the stale-name case.

Password recovery email is **not** an application defect. The Auth log at `2026-10-15 23:49:55` was `POST /recover` **429 email rate limit exceeded**. Delivery is still unverified. This branch also stops an ordinary signed-in session from changing the password at `/reset-password`: the recovery callback sets a one-hour `httpOnly` cookie `cs-recovery`, and the page and action both require it. Login does not set it. Sign-out clears it.

Hosted cross-user enforcement (user A cannot read or update user B) has not been shown with two authenticated sessions. The local script `web/supabase/verify-profiles.sql` is the check that uses `set role authenticated`. The founder can run the two-session check below when convenient.

Do not merge to `main`. Do not mark Milestone 3 accepted. Milestone 4 may proceed on its own branch from this work; it does not wait on the recovery email.

## Still required before full acceptance

1. After the mailer rate limit resets, request one recovery email, open it in the same browser, set a new password, and sign in with it. Do not send repeated requests.
2. Confirm an ordinary login cannot open `/reset-password` and change the password (no `cs-recovery` cookie). This is on the new preview once this branch is deployed.
3. Optional hosted cross-user check, in the SQL editor, after `begin; set local role authenticated; set local request.jwt.claim.sub = '<user A uuid>';` then `select display_name from public.profiles;` returns only A, and `update public.profiles set display_name = 'nope' where id = '<user B uuid>';` changes zero rows. `rollback;`

## Nonblocking

- Phone confirmation on, anonymous sign-ins off, and no extra providers are still dashboard settings to confirm.
- Display names are checked in the app. The database does not yet reject control or bidi characters.
- The built-in mailer is not suitable for people outside the Supabase team. Custom SMTP needs a separate approval.
- An invalid link tells the visitor the link was used, and does not suggest signing in.
- The display-name fix is unit-tested and not yet exercised on a hosted preview.
