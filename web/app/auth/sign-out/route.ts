import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { siteOrigin } from "@/lib/site-url"
import { RECOVERY_COOKIE } from "@/lib/auth/recovery"
import {
  authCookieOptions,
  createAuthClient,
  finishSignOut,
  isAuthCookieName,
} from "@/lib/supabase/auth-client"

export async function POST() {
  const origin = siteOrigin()
  if (!origin) {
    return new NextResponse("Accounts are unavailable right now.", {
      status: 503,
      headers: { "cache-control": "no-store" },
    })
  }
  const cookieStore = await cookies()
  let acceptWrites = true
  const supabase = createAuthClient(
    () => cookieStore.getAll(),
    (cookiesToSet) => {
      if (!acceptWrites) return
      for (const cookie of cookiesToSet) {
        cookieStore.set(cookie.name, cookie.value, cookie.options)
      }
    },
  )
  await finishSignOut(supabase, () => {
    acceptWrites = false
    for (const cookie of cookieStore.getAll()) {
      if (!isAuthCookieName(cookie.name)) continue
      cookieStore.set(cookie.name, "", { ...authCookieOptions(), maxAge: 0 })
    }
    cookieStore.set(RECOVERY_COOKIE, "", { ...authCookieOptions(), maxAge: 0 })
  })
  return NextResponse.redirect(new URL("/", origin), {
    status: 303,
    headers: { "cache-control": "no-store" },
  })
}

export function GET() {
  return new NextResponse("Method not allowed.", {
    status: 405,
    headers: { allow: "POST", "cache-control": "no-store" },
  })
}
