import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isAuthRefreshPath, refreshAuthSession } from "@/lib/supabase/refresh-session"
import { isYaleListingId } from "@/lib/yale/listings"

const missingListingHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Listing not found · College Space</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&amp;family=Outfit:wght@400;500&amp;display=swap" />
  <style>
    body { margin: 0; min-height: 100vh; background: oklch(0.965 0.012 90); color: oklch(0.25 0.02 65); font-family: Outfit, sans-serif; }
    header, main { max-width: 72rem; margin: 0 auto; padding: 0 1.25rem; }
    header { display: flex; align-items: center; height: 4.25rem; border-bottom: 1px solid oklch(0.86 0.02 80); }
    a.mark { color: inherit; text-decoration: none; font-family: Fraunces, Georgia, serif; font-size: 1.25rem; }
    main { padding: 5rem 1.25rem; }
    .card { max-width: 40rem; margin: 0 auto; text-align: center; border: 1px dashed oklch(0.86 0.02 80); background: oklch(0.985 0.008 90); border-radius: 0.4rem; padding: 3.5rem 1.5rem; }
    .eyebrow { letter-spacing: 0.16em; text-transform: uppercase; font-size: 0.75rem; color: oklch(0.46 0.02 65); }
    h1 { font-family: Fraunces, Georgia, serif; font-weight: 500; font-size: 1.875rem; letter-spacing: -0.02em; margin: 0.75rem 0 0; }
    p { color: oklch(0.46 0.02 65); font-size: 0.875rem; line-height: 1.5; }
    a.action { display: inline-flex; margin-top: 1.5rem; height: 2.5rem; align-items: center; padding: 0 1rem; border: 1px solid oklch(0.86 0.02 80); border-radius: 0.4rem; color: inherit; text-decoration: none; }
  </style>
</head>
<body>
  <header><a class="mark" href="/">College Space</a></header>
  <main>
    <div class="card">
      <p class="eyebrow">Demo catalog</p>
      <h1>That listing isn’t in the demo catalog.</h1>
      <p>The address doesn’t match a sample space. Nothing was held or charged.</p>
      <a class="action" href="/search">See demo spaces</a>
    </div>
  </main>
</body>
</html>`

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isAuthRefreshPath(pathname)) return refreshAuthSession(request)

  if (pathname === "/" || pathname === "/search" || pathname === "/find") {
    return continueWithSource("file")
  }

  const listingMatch = pathname.match(/^\/listings\/([^/]+)\/?$/)
  if (!listingMatch) return NextResponse.next()

  let id = ""
  try {
    id = decodeURIComponent(listingMatch[1])
  } catch {
    id = ""
  }
  if (!isYaleListingId(id)) return missingListing("file")
  return continueWithSource("file")
}

function continueWithSource(source: "supabase" | "file") {
  const response = NextResponse.next()
  response.headers.set("x-catalog-source", source)
  return response
}

function missingListing(source: "supabase" | "file") {
  return new NextResponse(missingListingHtml, {
    status: 404,
    headers: catalogHeaders(source),
  })
}

function catalogHeaders(source: "supabase" | "file") {
  return {
    "content-type": "text/html; charset=utf-8",
    "x-robots-tag": "noindex",
    "x-catalog-source": source,
  }
}

export const config = {
  matcher: [
    "/",
    "/search",
    "/listings/:id",
    "/account",
    "/reset-password",
    "/auth/:path*",
    "/host",
    "/host/:path*",
    "/listing-photos/:path*",
  ],
}
