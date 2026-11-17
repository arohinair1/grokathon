import { NextResponse, type NextRequest } from "next/server"
import { createAuthClient, isAuthRefreshPath } from "@/lib/supabase/auth-client"

export { isAuthRefreshPath }

const PRIVATE_CACHE = {
  "cache-control": "private, no-cache, no-store, must-revalidate, max-age=0",
  expires: "0",
  pragma: "no-cache",
}

type PendingCookie = { name: string; value: string; options: Record<string, unknown> }

function stamp(response: NextResponse, cookiesToSet: PendingCookie[], headers: Record<string, string>) {
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  for (const [key, value] of Object.entries({ ...headers, ...PRIVATE_CACHE })) {
    response.headers.set(key, value)
  }
  return response
}

export async function refreshAuthSession(request: NextRequest) {
  let pending: PendingCookie[] = []
  let pendingHeaders: Record<string, string> = {}
  let response = NextResponse.next({ request })

  const supabase = createAuthClient(
    () => request.cookies.getAll(),
    (cookiesToSet, headers) => {
      pending = cookiesToSet
      pendingHeaders = headers
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
      response = stamp(NextResponse.next({ request }), cookiesToSet, headers)
    },
  )

  response = stamp(response, pending, pendingHeaders)

  if (!supabase) return response

  let hasUser = false
  try {
    const { data, error } = await supabase.auth.getClaims()
    hasUser = !error && Boolean(data?.claims)
  } catch {
    hasUser = false
  }

  const pathname = request.nextUrl.pathname
  if (hasUser || (pathname !== "/account" && pathname !== "/reset-password")) {
    return response
  }

  const redirectUrl = request.nextUrl.clone()
  if (pathname === "/account") {
    redirectUrl.pathname = "/login"
    redirectUrl.search = "?next=/account"
  } else {
    redirectUrl.pathname = "/forgot-password"
    redirectUrl.search = ""
  }
  return stamp(NextResponse.redirect(redirectUrl), pending, pendingHeaders)
}

