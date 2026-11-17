# Quality standards

Apply these in proportion to the change. A type tweak does not need a security audit. Authorization, booking state, and payments do.

## Every change

- TypeScript is strict and the production build passes.
- `npm run lint --prefix web` passes.
- The diff stays inside the task's files.
- New marketplace rules (search filters, availability, request status) have unit tests. Do not report a failing check as passing.

## Interface

- Desktop and mobile both work. No horizontal overflow on a 390px width.
- Text contrast is readable. Controls have visible focus.
- Images have useful alt text.
- Demo inventory is labeled on the listing, not only in a footnote.
- Empty, loading, and error states are designed components, not raw browser alerts.
- Shared header, footer, cards, and form fields stay consistent across pages.

## Data and trust

- Milestone 1 prices, hosts, and dates are fictional demo data.
- Availability filtering must treat a requested range as contained by the listing window, including a reversed from/until pair.
- When requests exist, the server or database enforces status transitions and date conflicts. The browser is not the source of truth.
- A request is not a paid reservation until the founder says otherwise.

## Security, when the change touches it

- Row Level Security is the authorization boundary for Supabase data.
- No service-role key in client code.
- No secrets in git.
- Auth checks use the server session, not a decoded cookie alone.
