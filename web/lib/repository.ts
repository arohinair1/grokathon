import { cache } from "react"
import {
  filterListings,
  getListing,
  isCategoryId,
  listingSearchOr,
  listings,
  requestedRange,
  type Listing,
  type PriceUnit,
  type CatalogQuery,
} from "@/lib/catalog"
import { publicPhotoSrc } from "@/lib/host/validation"
import { CATALOG_FETCH_TIMEOUT_MS, PUBLISHED_LISTING_COLUMNS } from "@/lib/listing-access"
import { createAnonClient } from "@/lib/supabase"

export class CatalogUnavailable extends Error {
  constructor() {
    super("The demo catalog can't be reached.")
    this.name = "CatalogUnavailable"
  }
}

export function isCatalogUnavailable(error: unknown): error is CatalogUnavailable {
  return error instanceof CatalogUnavailable
}

type PhotoRow = {
  id?: string
  path: string
  alt: string
  sort_order: number
  is_primary: boolean
}

type ListingRow = {
  id?: string
  slug: string
  title: string
  summary: string
  description: string
  category: string
  space_type: string
  neighborhood: string
  city: string
  state: string
  price_cents: number
  price_unit: PriceUnit
  capacity_label: string
  available_from: string
  available_until: string
  featured: boolean
  is_demo: boolean
  sample_host_label: string
  listing_photos: PhotoRow[] | null
}

export function mapListingRow(row: ListingRow): Listing {
  if (!isCategoryId(row.category)) {
    throw new Error(`Unknown category on ${row.slug}`)
  }
  const photos = [...(row.listing_photos ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order || a.path.localeCompare(b.path),
  )
  const primary = photos.find((photo) => photo.is_primary) ?? photos[0]
  if (!primary) throw new Error(`Published listing ${row.slug} has no photo`)

  return {
    id: row.slug,
    title: row.title,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    category: row.category,
    spaceType: row.space_type,
    priceCents: row.price_cents,
    priceUnit: row.price_unit,
    summary: row.summary,
    description: row.description,
    image: publicPhotoSrc(primary),
    imageAlt: primary.alt,
    hostName: row.sample_host_label,
    capacityLabel: row.capacity_label,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    featured: row.featured,
    demo: row.is_demo,
  }
}

async function omitBlockedListings(
  client: NonNullable<ReturnType<typeof createAnonClient>>,
  rows: ListingRow[],
  range: [string, string] | null,
): Promise<ListingRow[]> {
  if (!range || rows.length === 0) return rows
  const ids = rows.flatMap((row) => (row.id ? [row.id] : []))
  if (ids.length === 0) return rows
  const matched = await client.rpc("listing_ids_blocked_between", {
    p_ids: ids,
    p_start: range[0],
    p_end: range[1],
  })
  if (!matched.error && Array.isArray(matched.data)) {
    const blocked = new Set(
      matched.data.flatMap((row: string | { listing_id?: string }) => {
        if (typeof row === "string") return [row]
        return row?.listing_id ? [row.listing_id] : []
      }),
    )
    return rows.filter((row) => !row.id || !blocked.has(row.id))
  }
  if (matched.error && matched.error.code !== "PGRST202" && matched.error.code !== "42883") {
    rejectCatalog(matched.error)
  }
  const { data, error } = await client
    .from("listing_blocked_dates")
    .select("listing_id")
    .in("listing_id", ids)
    .lte("starts_on", range[1])
    .gte("ends_on", range[0])
    .limit(1000)
    .abortSignal(AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS))
    .retry(false)
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01" || error.code === "PGRST204") return rows
    rejectCatalog(error)
  }
  if ((data ?? []).length >= 1000) rejectCatalog({ code: "PGRST103" })
  const blocked = new Set((data ?? []).map((row) => row.listing_id))
  return rows.filter((row) => !row.id || !blocked.has(row.id))
}

export function mapCatalogRows(rows: ListingRow[]): Listing[] {
  const mapped: Listing[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    try {
      const listing = mapListingRow(row)
      if (seen.has(listing.id)) continue
      seen.add(listing.id)
      mapped.push(listing)
    } catch (cause) {
      console.error("Catalog row rejected", cause instanceof Error ? cause.name : "error")
    }
  }
  return mapped
}

function rejectCatalog(error: { code?: string } | null): never {
  console.error("Catalog read failed", error?.code ?? "invalid response")
  throw new CatalogUnavailable()
}

export async function searchListings(query: CatalogQuery, collegeId?: string): Promise<Listing[]> {
  const client = createAnonClient()
  if (!client) return collegeId ? [] : filterListings(listings, query)

  let request = client
    .from("listings")
    .select(PUBLISHED_LISTING_COLUMNS)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .limit(24)
    .abortSignal(AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS))
    .retry(false)
  if (collegeId) {
    const links = await client
      .from("listing_colleges")
      .select("listing_id")
      .eq("college_id", collegeId)
      .limit(200)
      .abortSignal(AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS))
      .retry(false)
    if (links.error || !Array.isArray(links.data)) {
      // A database that predates listing_colleges is the file catalog, not an outage.
      if (links.error?.code === "42P01" || links.error?.code === "PGRST205") {
        return collegeId === "a0000000-0000-4000-8000-000000000001"
          ? filterListings(listings, query)
          : []
      }
      rejectCatalog(links.error)
    }
    const ids = links.data.map((row) => row.listing_id).filter((id): id is string => typeof id === "string")
    if (ids.length === 0) return []
    request = request.in("id", ids)
  }

  if (query.category) request = request.eq("category", query.category)
  if (query.neighborhood) request = request.eq("neighborhood", query.neighborhood)
  const text = listingSearchOr(query.q)
  if (text) request = request.or(text)
  const range = requestedRange(query)
  if (range) {
    request = request.lte("available_from", range[0]).gte("available_until", range[1])
  }

  const { data, error } = await request
  if (error || !Array.isArray(data)) rejectCatalog(error)
  try {
    const visible = await omitBlockedListings(client, data as ListingRow[], range)
    return mapCatalogRows(visible)
  } catch (cause) {
    console.error("Catalog row rejected", cause instanceof Error ? cause.name : "error")
    throw new CatalogUnavailable()
  }
}

export const getPublishedListing = cache(async function getPublishedListing(
  id: string,
): Promise<Listing | null> {
  const client = createAnonClient()
  if (!client) return getListing(id) ?? null

  const { data, error } = await client
    .from("listings")
    .select(PUBLISHED_LISTING_COLUMNS)
    .eq("slug", id)
    .eq("status", "published")
    .abortSignal(AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS))
    .retry(false)
    .maybeSingle()

  if (error) rejectCatalog(error)
  if (!data) return null
  try {
    return mapListingRow(data as ListingRow)
  } catch (cause) {
    console.error("Catalog row rejected", cause instanceof Error ? cause.name : "error")
    return null
  }
})
