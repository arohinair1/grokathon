# College Space — Yale

College Space — Yale is a demo marketplace for student storage and off-street parking around Yale in New Haven. A student can browse a fictional sample catalog, or describe what they need in plain language. Grok SpaceMatch reads that request on the server, and College Space filters the sample catalog and explains the listings that fit.

Two use cases are in the demo:

- **Storage.** Summer and break storage for boxes, luggage, a mini-fridge, or a bicycle.
- **Parking.** A driveway or covered spot for the semester, and a weekend driveway for a visit, move-in, or graduation. Listings state vehicle limits and whether overnight parking is included.

Sample listings, hosts, and prices are illustrative. Nothing here collects payment or reserves a real space. College Space is not a Yale University service.

## Built with Grok

Hackathon work in Cursor used Grok. SpaceMatch is written to call the xAI API from the server (`grok-4.7` unless `XAI_MODEL` is set). Listing facts, availability, and prices come from the checked-in sample catalog. Grok does not create listings.

Without `XAI_API_KEY`, SpaceMatch says live Grok is not configured and uses a labeled local parser. That parser is not described as Grok.

The screenshot below is the project owner’s capture of Grok in Cursor. This repository does not include a separate image file. If that attachment is missing, add a real screenshot at `docs/grok-in-cursor.png` and do not substitute a generated image.

<img width="965" height="752" alt="Grok in Cursor, captured by the project owner on November 17, 2026" src="https://github.com/user-attachments/assets/edabbdde-eae2-4b73-bdc3-4edf49ff020f" />

## Features

These work from the sample catalog with no database:

- Homepage, navigation, and neighborhood filters
- Storage search and storage listing pages, including price, neighborhood, capacity, availability, and restrictions
- Parking search and parking listing pages, including price, vehicle limits, and overnight notes
- Grok SpaceMatch for storage and parking. Live xAI calls run only when `XAI_API_KEY` is set on the server. Otherwise the page uses the labeled local parser.
- A simulated booking request stored in the browser
- A host draft on `/list`, also stored in this browser only

These exist in the code and need a Supabase project before they do anything persistent:

- Accounts, login, and password recovery
- Host publishing, photos, and blocked dates
- Booking requests saved to a database

Not part of this demo: payments, real reservations, and a hosted college directory. `/colleges` redirects to search.

## Provenance

This repository is the Yale demo plus earlier College Space marketplace code. Git history still contains those earlier milestones, including accounts, host tools, and booking requests that expect Supabase. The Yale catalog and SpaceMatch sit on top of that code. Do not treat the older marketplace implementation as work that was written from scratch for this hackathon, and do not point it at an existing production database.

## Tech stack

- Next.js 16 App Router and React 19, in `web/`
- TypeScript, Tailwind CSS 4, and Vitest
- Optional Supabase for accounts and persisted listings
- Optional xAI API for live SpaceMatch

## Prerequisites

- Node.js 20.9 or newer
- npm (the lockfile is `web/package-lock.json`)
- An xAI API key only if you want live Grok answers
- A Supabase project only if you want accounts or persisted host listings. This demo does not require one.

## Installation

```bash
git clone https://github.com/arohinair1/grokathon.git
cd grokathon/web
npm ci
```

## Environment

Copy the example file and leave values blank for the sample-catalog demo:

```bash
cp .env.example .env.local
```

| Name | Required | Purpose |
| --- | --- | --- |
| `XAI_API_KEY` | No | Server-only xAI key. Blank uses the labeled local parser. Never prefix it with `NEXT_PUBLIC_`. |
| `XAI_MODEL` | No | Model id. Defaults to `grok-4.7`. |
| `XAI_API_BASE_URL` | No | API root. Defaults to `https://api.x.ai/v1`. |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project origin, for accounts and persisted data. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anon key. Row Level Security is what keeps writes closed. Do not add a service-role key. |
| `NEXT_PUBLIC_SITE_URL` | No | Public site origin. Use `http://localhost:3000` locally. Account pages say they are unavailable when this is missing. |

Do not commit `.env.local`. Do not run the SQL files in `web/supabase/` against an existing database unless you intend to change that database.

## Running locally

From `web/`:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests, lint, and production build

From `web/`:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

`npm run build` skips the hosted catalog check when the Supabase variables are unset. The checked-in Next.js version prints a security advisory and may exit once before a retry continues the build.

## Using the demo

**Storage.** Open [http://localhost:3000/search?category=storage](http://localhost:3000/search?category=storage). Filter by neighborhood or dates, then open a card. A storage page shows the illustrative price, neighborhood, capacity, availability, and restrictions.

**Parking.** Open [http://localhost:3000/search?category=monthly-parking](http://localhost:3000/search?category=monthly-parking). The catalog includes monthly spots for a standard car and a weekend driveway near Old Campus that allows an SUV and includes overnight parking. Open a card to read the vehicle limit and access notes.

**SpaceMatch.** Open [http://localhost:3000/find](http://localhost:3000/find). Try:

- `I'm going home for the summer and need to store a mini-fridge, two suitcases, and four boxes near Old Campus for under $100 a month.`
- `My parents are visiting Yale and need a driveway spot near Old Campus for a weekend. They have an SUV and want to spend under $100 total.`

The page shows the category it read, the constraints it kept, and the sample listings that satisfied them, with an explanation tied to those listings. A standard-car listing is not offered for the SUV request.

**Listing request.** On a listing, choose dates inside the sample window and submit the sample request. It is stored in this browser and appears at `/bookings`. It is not sent to a host and it does not reserve the space.

**Host draft.** Open `/list`, describe a space, and approve the draft. It stays in this browser. `/host` is the account hosting screen and stays unavailable until Supabase is configured.

## Deployment

Deploy this repository as its own Vercel project. Do not reuse the original College Space project or a separate `grok` project.

- Framework: Next.js
- Root directory: `web`
- Production branch: the branch you intend to demo
- Install, build, and output: leave the framework defaults (`npm ci` or `npm install`, `npm run build`)

No environment variables are required for the sample catalog. To turn on live Grok, set `XAI_API_KEY` for Production and Preview. Set `XAI_MODEL` or `XAI_API_BASE_URL` only to override the defaults. Set the Supabase variables and `NEXT_PUBLIC_SITE_URL` only when accounts should work, then redeploy, because `NEXT_PUBLIC_` values are read at build time.

A successful Vercel build is not enough. Open the deployment URL, browse storage and parking, open one listing of each, and submit both SpaceMatch prompts above. Without `XAI_API_KEY`, the page must say that live Grok is not configured.

## Known limitations

- Listings, hosts, prices, and photographs are fictional. Photographs are credited in `web/public/images/CREDITS.md`.
- Booking requests and host drafts in the Yale demo are browser-only.
- Live Grok is off until a server-side `XAI_API_KEY` is set. The local parser is labeled as such.
- Accounts, published host listings, and database bookings need Supabase. This repository does not ship those credentials.
- The app does not take payment.
