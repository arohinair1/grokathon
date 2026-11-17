import { isIsoDate, listingTextTerm, type CatalogQuery } from "@/lib/catalog"
import {
  isYaleNeighborhood,
  isYaleSearchCategory,
  yaleListings,
  type YaleListing,
  type YaleNeighborhood,
} from "@/lib/yale/listings"

export type YaleQuery = {
  category: "storage" | "monthly-parking" | ""
  neighborhood: YaleNeighborhood | ""
  from: string
  until: string
  q: string
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

export function parseYaleQuery(raw: Record<string, string | string[] | undefined>): YaleQuery {
  const category = firstParam(raw.category)
  const neighborhood = firstParam(raw.neighborhood)
  const from = firstParam(raw.from)
  const until = firstParam(raw.until)
  return {
    category: isYaleSearchCategory(category) ? category : "",
    neighborhood: isYaleNeighborhood(neighborhood) ? neighborhood : "",
    from: isIsoDate(from) ? from : "",
    until: isIsoDate(until) ? until : "",
    q: listingTextTerm(firstParam(raw.q)),
  }
}

export function yaleRange(query: Pick<YaleQuery, "from" | "until">): [string, string] | null {
  const start = query.from || query.until
  const end = query.until || query.from
  if (!start || !end) return null
  return start <= end ? [start, end] : [end, start]
}

export function listingCovers(listing: YaleListing, range: [string, string] | null): boolean {
  if (!range) return true
  return range[0] >= listing.availableFrom && range[1] <= listing.availableUntil
}

export function filterYaleListings(source: YaleListing[], query: YaleQuery): YaleListing[] {
  const range = yaleRange(query)
  const needle = query.q.toLowerCase()
  return source.filter((listing) => {
    if (query.category && listing.category !== query.category) return false
    if (query.neighborhood && listing.neighborhood !== query.neighborhood) return false
    if (!listingCovers(listing, range)) return false
    if (needle) {
      const haystack = `${listing.title} ${listing.summary} ${listing.description} ${listing.neighborhood}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}

export function describeYaleQuery(query: YaleQuery): string {
  const parts: string[] = []
  if (query.q) parts.push(`matching “${query.q}”`)
  if (query.category === "storage") parts.push("storage")
  if (query.category === "monthly-parking") parts.push("parking")
  if (query.neighborhood) parts.push(`near ${query.neighborhood}`)
  const range = yaleRange(query)
  if (range) parts.push(`from ${range[0]} to ${range[1]}`)
  if (parts.length === 0) return "Sample spaces around Yale"
  return parts.join(" ")
}

export function yaleQueryToSearch(query: YaleQuery): string {
  const params = new URLSearchParams()
  if (query.category) params.set("category", query.category)
  if (query.neighborhood) params.set("neighborhood", query.neighborhood)
  if (query.from) params.set("from", query.from)
  if (query.until) params.set("until", query.until)
  if (query.q) params.set("q", query.q)
  const value = params.toString()
  return value ? `?${value}` : ""
}

export function featuredYaleListings(): YaleListing[] {
  return yaleListings.filter((listing) => listing.featured)
}

/** CatalogQuery-shaped helper for shared form defaults. Neighborhood stays a plain string. */
export function yaleQueryFields(query: YaleQuery): CatalogQuery {
  return {
    category: query.category,
    neighborhood: "",
    from: query.from,
    until: query.until,
    q: query.q,
  }
}
