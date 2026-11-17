import { cookies } from "next/headers"
import { createAuthClient } from "@/lib/supabase/auth-client"

export async function createServerAuthClient() {
  const cookieStore = await cookies()
  return createAuthClient(
    () => cookieStore.getAll(),
    (cookiesToSet) => {
      try {
        for (const cookie of cookiesToSet) {
          cookieStore.set(cookie.name, cookie.value, cookie.options)
        }
      } catch {
        // A Server Component cannot always write cookies. Auth routes refresh in proxy.ts.
      }
    },
  )
}
