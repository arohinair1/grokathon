import { listings } from "@/lib/catalog"

const fileSlugs = new Set(listings.map((listing) => listing.id))

export function isListingSlug(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
}

export const CATALOG_FETCH_TIMEOUT_MS = 4000

/** Columns the pages select. The proxy uses the same shape so a bad catalog query fails before the page. */
export const PUBLISHED_LISTING_COLUMNS =
  "id,slug,title,summary,description,category,space_type,neighborhood,city,state,price_cents,price_unit,capacity_label,available_from,available_until,featured,is_demo,sample_host_label,listing_photos(id,path,alt,sort_order,is_primary)"

export type ListingLookup = "file" | "unavailable" | boolean
export type ListingDecision = "allow" | "missing" | "unavailable"

/**
 * `file` uses the checked-in catalog. `unavailable` means Supabase was
 * configured and the lookup failed. A boolean is the published answer.
 */
export function listingDecision(id: string, lookup: ListingLookup): ListingDecision {
  if (!isListingSlug(id)) return "missing"
  if (lookup === "file") return fileSlugs.has(id) ? "allow" : "missing"
  if (lookup === "unavailable") return "unavailable"
  return lookup ? "allow" : "missing"
}

export async function publishedListingExists(
  id: string,
  env: { url: string; anonKey: string },
): Promise<boolean | null> {
  if (!isListingSlug(id)) return false
  const endpoint = new URL("/rest/v1/listings", env.url)
  endpoint.searchParams.set("select", PUBLISHED_LISTING_COLUMNS)
  endpoint.searchParams.set("slug", `eq.${id}`)
  endpoint.searchParams.set("status", "eq.published")
  endpoint.searchParams.set("limit", "1")
  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: env.anonKey,
        authorization: `Bearer ${env.anonKey}`,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS),
    })
    if (!response.ok) return null
    const rows: unknown = await response.json()
    if (!Array.isArray(rows)) return null
    return rows.some(
      (row) =>
        !!row &&
        typeof row === "object" &&
        "slug" in row &&
        (row as { slug: unknown }).slug === id,
    )
  } catch {
    return null
  }
}

export async function catalogIsReachable(env: {
  url: string
  anonKey: string
}): Promise<boolean> {
  const endpoint = new URL("/rest/v1/listings", env.url)
  endpoint.searchParams.set("select", PUBLISHED_LISTING_COLUMNS)
  endpoint.searchParams.set("status", "eq.published")
  endpoint.searchParams.set("limit", "1")
  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: env.anonKey,
        authorization: `Bearer ${env.anonKey}`,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS),
    })
    if (!response.ok) return false
    const rows: unknown = await response.json()
    return Array.isArray(rows)
  } catch {
    return false
  }
}
