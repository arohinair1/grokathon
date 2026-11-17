# Local account checks

These checks used a test-only auth stand-in in front of local PostgREST. They are not hosted Supabase Auth, and they did not send email.

- `web/supabase/verify-rls.sql` passed after the profile migration on `college_space` and on a throwaway database.
- `web/supabase/verify-profiles.sql` passed on the throwaway database: owner read and update, cross-user denial, no anon read, no insert, delete, truncate, or id change. A blank or missing signup name became `Member`. A 200-character name was stored as 80 characters.
- Anonymous PostgREST requests to `profiles` returned permission denied. A second user's update did not change the first user's display name.
- Against the app on `http://localhost:3000` with `NEXT_PUBLIC_SITE_URL=http://localhost:3000`:
  - `/account` without a session redirected to `/login?next=/account` with `cache-control: private, no-store`.
  - `/login?next=//evil.example` kept the form's next value at `/account`.
  - `/auth/callback?token_hash=abc&next=https://evil.example` finished on `/login?error=link`.
  - `GET /auth/sign-out` returned 405.
  - Published listing, missing listing, and the draft slug behaved as 200, 404, and 404.
  - `/catalog-health` reported eight published listings, eight photos, and `draftVisible: false`, with no write probe.
- Browser, synthetic addresses only: wrong password stayed on the login page; a correct password opened `/account`; the display name saved; sign-out returned to the homepage; signup and a duplicate signup showed the same link sentence; a short password was rejected; the recovery link set a new password and that password logged in. Desktop and a 390px menu were checked.
- Hosted confirmation mail and hosted password-recovery mail were not sent.
