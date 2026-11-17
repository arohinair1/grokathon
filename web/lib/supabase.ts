import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { CATALOG_FETCH_TIMEOUT_MS } from "@/lib/listing-access"

export type SupabasePublicEnv = {
  url: string
  anonKey: string
}

/**
 * Supabase's client appends `rest/v1` to this URL. A dashboard value that
 * already ends in `/rest/v1` would request `/rest/v1/rest/v1` and the gateway
 * rejects it. Callers only need the project origin.
 */
export function supabaseProjectOrigin(url: string): string | null {
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null
    return parsed.origin
  } catch {
    return null
  }
}

export function supabasePublicEnv(): SupabasePublicEnv | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!rawUrl || !anonKey) return null
  const url = supabaseProjectOrigin(rawUrl)
  if (!url) return null
  return { url, anonKey }
}

export function createAnonClient(): SupabaseClient | null {
  const env = supabasePublicEnv()
  if (!env) return null
  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: { timeout: CATALOG_FETCH_TIMEOUT_MS, retry: false },
  })
}
