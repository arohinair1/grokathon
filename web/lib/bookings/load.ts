import { rangesOverlap } from "@/lib/host/validation"
import { createAnonClient } from "@/lib/supabase"
import { createServerAuthClient } from "@/lib/supabase/server"
import type { PriceUnit } from "@/lib/catalog"

export type DateSpan = { startsOn: string; endsOn: string }

export async function loadListingAvailability(slug: string): Promise<{
  blocked: DateSpan[]
  reserved: DateSpan[]
}> {
  const empty = { blocked: [], reserved: [] }
  const client = createAnonClient()
  if (!client) return empty
  const listing = await client.from("listings").select("id").eq("slug", slug).eq("status", "published").maybeSingle()
  if (listing.error || !listing.data) return empty
  const listingId = listing.data.id as string
  const [blocked, reserved] = await Promise.all([
    client.from("listing_blocked_dates").select("starts_on, ends_on").eq("listing_id", listingId),
    client.rpc("listing_reserved_spans", { target: listingId }),
  ])
  const spans = (rows: { starts_on?: string; ends_on?: string }[] | null): DateSpan[] =>
    (rows ?? []).flatMap((row) =>
      row.starts_on && row.ends_on ? [{ startsOn: row.starts_on, endsOn: row.ends_on }] : [],
    )
  return {
    blocked: blocked.error ? [] : spans(blocked.data),
    reserved: reserved.error ? [] : spans(reserved.data),
  }
}

export type BookingStatus = "pending" | "accepted" | "declined" | "cancelled"

export type BookingRecord = {
  id: string
  listingId: string
  listingTitle: string
  listingSlug: string
  startsOn: string
  endsOn: string
  status: BookingStatus
  priceCents: number
  priceUnit: PriceUnit
  createdAt: string
  counterparty: string | null
  overlapsPending: boolean
}

type BookingQueryRow = {
  id: string
  listing_id: string
  starts_on: string
  ends_on: string
  status: BookingStatus
  price_cents: number
  price_unit: PriceUnit
  created_at: string
  listings: { title: string; slug: string } | { title: string; slug: string }[] | null
}

function oneListing(value: BookingQueryRow["listings"]): { title: string; slug: string } | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function isStatus(value: string): value is BookingStatus {
  return value === "pending" || value === "accepted" || value === "declined" || value === "cancelled"
}

export async function loadBookings(kind: "renter" | "host"): Promise<
  { ok: true; rows: BookingRecord[] } | { ok: false; reason: "unavailable" | "signed-out" }
> {
  const supabase = await createServerAuthClient()
  if (!supabase) return { ok: false, reason: "unavailable" }
  const user = await supabase.auth.getUser()
  if (user.error || !user.data.user) return { ok: false, reason: "signed-out" }

  let request = supabase
    .from("booking_requests")
    .select("id, listing_id, starts_on, ends_on, status, price_cents, price_unit, created_at, listings(title, slug)")
    .order("created_at", { ascending: false })
  if (kind === "renter") {
    request = request.eq("renter_id", user.data.user.id)
  } else {
    const owned = await supabase.rpc("host_listing_ids")
    if (owned.error) return { ok: false, reason: "unavailable" }
    const ids = (owned.data ?? [])
      .map((row: { listing_id?: string }) => row.listing_id)
      .filter((id: string | undefined): id is string => typeof id === "string")
    if (ids.length === 0) return { ok: true, rows: [] }
    request = request.in("listing_id", ids)
  }
  const query = await request
  if (query.error) {
    if (query.error.code === "42P01" || query.error.code === "PGRST205" || query.error.code === "PGRST200") {
      return { ok: false, reason: "unavailable" }
    }
    return { ok: false, reason: "unavailable" }
  }

  const raw = (query.data ?? []) as BookingQueryRow[]
  const names = await Promise.all(
    raw.map(async (row) => {
      const named = await supabase.rpc("booking_counterparty_name", { target: row.id })
      return typeof named.data === "string" ? named.data : null
    }),
  )

  const rows = raw.flatMap((row, index): BookingRecord[] => {
    if (!isStatus(row.status)) return []
    const listing = oneListing(row.listings)
    return [
      {
        id: row.id,
        listingId: row.listing_id,
        listingTitle: listing?.title ?? "A space you requested",
        listingSlug: listing?.slug ?? "",
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        status: row.status,
        priceCents: row.price_cents,
        priceUnit: row.price_unit,
        createdAt: row.created_at,
        counterparty: names[index] ?? null,
        overlapsPending: false,
      },
    ]
  })

  if (kind === "host") {
    for (const row of rows) {
      if (row.status !== "pending") continue
      row.overlapsPending = rows.some(
        (other) =>
          other.id !== row.id &&
          other.listingId === row.listingId &&
          (other.status === "pending" || other.status === "accepted") &&
          rangesOverlap(
            { start: row.startsOn, end: row.endsOn },
            { start: other.startsOn, end: other.endsOn },
          ),
      )
    }
  }

  return { ok: true, rows }
}
