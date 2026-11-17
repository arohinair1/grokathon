import { NextResponse, type NextRequest } from "next/server"
import { RECOVERY_COOKIE } from "@/lib/auth/recovery"
import { authCookieOptions, createAuthClient } from "@/lib/supabase/auth-client"
import { siteOrigin } from "@/lib/site-url"

const NO_STORE = {
  "cache-control": "private, no-cache, no-store, must-revalidate, max-age=0",
  expires: "0",
  pragma: "no-cache",
  "x-robots-tag": "noindex",
}

function unavailable() {
  return new NextResponse("Accounts are unavailable right now.", {
    status: 503,
    headers: NO_STORE,
  })
}

function isPkceCode(code: string): boolean {
  return /^[A-Za-z0-9._~-]{10,512}$/.test(code)
}

export async function exchangeAuthCode(request: NextRequest, successPath: "/account" | "/reset-password") {
  const origin = siteOrigin()
  if (!origin) return unavailable()

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const failed =
    !code ||
    !isPkceCode(code) ||
    url.searchParams.has("error") ||
    url.searchParams.has("token_hash")

  let target = failed ? "/login?error=link" : successPath
  let pending: { name: string; value: string; options: Record<string, unknown> }[] = []
  let pendingHeaders: Record<string, string> = {}

  const redirectTo = () => {
    const response = NextResponse.redirect(new URL(target, origin))
    for (const cookie of pending) response.cookies.set(cookie.name, cookie.value, cookie.options)
    for (const [key, value] of Object.entries({ ...pendingHeaders, ...NO_STORE })) {
      response.headers.set(key, value)
    }
    return response
  }

  if (failed) return redirectTo()

  const supabase = createAuthClient(
    () => request.cookies.getAll(),
    (cookiesToSet, headers) => {
      pending = cookiesToSet
      pendingHeaders = headers
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
    },
  )
  if (!supabase) return unavailable()

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) target = "/login?error=link"
  else if (successPath === "/reset-password") {
    pending.push({
      name: RECOVERY_COOKIE,
      value: "1",
      options: { ...authCookieOptions(), maxAge: 60 * 60 },
    })
  }
  return redirectTo()
}
