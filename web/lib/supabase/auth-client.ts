import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { siteOrigin } from "@/lib/site-url"
import { supabasePublicEnv } from "@/lib/supabase"

export function authCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: siteOrigin() !== "http://localhost:3000",
  }
}

export function accountsConfigured(): boolean {
  return siteOrigin() !== null && supabasePublicEnv() !== null
}

function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(8000)
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  return fetch(input, { ...init, signal })
}

type CookieList = { name: string; value: string }[]
type SetAuthCookies = (
  cookies: { name: string; value: string; options: Record<string, unknown> }[],
  headers: Record<string, string>,
) => void

export function createAuthClient(getAll: () => CookieList, setAll: SetAuthCookies): SupabaseClient | null {
  const env = supabasePublicEnv()
  if (!env) return null
  return createServerClient(env.url, env.anonKey, {
    cookieOptions: authCookieOptions(),
    global: { fetch: authFetch },
    auth: {
      flowType: "pkce",
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
    },
    cookies: {
      getAll,
      setAll,
    },
  })
}

export function isAuthRefreshPath(pathname: string): boolean {
  // Sign-out clears cookies itself. Refreshing first can write a new session
  // cookie onto the proxy response after the route has cleared it.
  if (pathname === "/auth/sign-out") return false
  return (
    pathname === "/account" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth/") ||
    pathname === "/host" ||
    pathname.startsWith("/host/") ||
    pathname.startsWith("/listing-photos/")
  )
}

const AUTH_COOKIE_PREFIX = /^sb-.+-auth-token/

export function isAuthCookieName(name: string): boolean {
  return AUTH_COOKIE_PREFIX.test(name)
}

export async function finishSignOut(
  supabase: { auth: { signOut: () => Promise<unknown> } } | null,
  clearCookies: () => void,
  waitMs = 4000,
) {
  if (supabase) {
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, waitMs)
    })
    await Promise.race([
      supabase.auth.signOut().then(
        () => undefined,
        () => undefined,
      ),
      deadline,
    ])
    clearTimeout(timer)
  }
  clearCookies()
}

export function hasAuthSessionCookie(cookies: CookieList): boolean {
  return cookies.some(
    (cookie) =>
      cookie.value.length > 0 && /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name),
  )
}
