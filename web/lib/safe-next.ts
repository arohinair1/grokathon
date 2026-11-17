import { siteOrigin } from "@/lib/site-url"

const FALLBACK = "/account"

function hasForbiddenCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (code <= 0x20 || code === 0x7f || char === "\\") return true
  }
  return false
}

/**
 * In-app path after a password sign-in. Email links do not use this.
 * Decode at most once, then keep only a path on the configured site origin.
 */
export function safeNextPath(next: string | null | undefined, origin = siteOrigin()): string {
  if (!origin || next == null) return FALLBACK
  const trimmed = next.trim()
  if (!trimmed) return FALLBACK

  let decoded: string
  try {
    decoded = decodeURIComponent(trimmed)
  } catch {
    return FALLBACK
  }

  if (!decoded.startsWith("/")) return FALLBACK
  if (decoded.startsWith("//") || hasForbiddenCharacter(decoded)) return FALLBACK

  let resolved: URL
  try {
    resolved = new URL(decoded, origin)
  } catch {
    return FALLBACK
  }

  if (resolved.origin !== origin) return FALLBACK
  if (resolved.pathname.startsWith("//")) return FALLBACK
  return `${resolved.pathname}${resolved.search}${resolved.hash}`
}
