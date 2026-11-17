/**
 * Auth redirects use this origin only. A missing or non-origin value fails
 * closed; the app does not read Host, x-forwarded-host, or VERCEL_URL.
 */
export function siteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.username || url.password || url.search || url.hash) return null
    if (url.pathname !== "/" && url.pathname !== "") return null
    if (url.origin === "http://localhost:3000") return url.origin
    if (url.protocol === "https:") return url.origin
    return null
  } catch {
    return null
  }
}
