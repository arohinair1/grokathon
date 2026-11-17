import { redirect } from "next/navigation"
import { dollarsFromCents, publicPhotoSrc } from "@/lib/host/validation"
import type { CollegeOption, DashboardListing, HostListing, StateOption } from "@/lib/host/types"
import { createServerAuthClient } from "@/lib/supabase/server"

export type { CollegeOption, DashboardListing, HostListing, HostPhoto, StateOption } from "@/lib/host/types"
export { photoPreviewSrc } from "@/lib/host/types"

function schemaMissing(error: { code?: string } | null): boolean {
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST202" ||
    error?.code === "PGRST204" ||
    error?.code === "PGRST205"
  )
}

async function client() {
  const supabase = await createServerAuthClient()
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect("/login?next=/host")
  return { supabase, userId: data.user.id }
}

export async function loadDirectory(): Promise<
  { ok: true; colleges: CollegeOption[]; states: StateOption[] } | { ok: false }
> {
  const ready = await client()
  if (!ready) return { ok: false }
  const [colleges, states] = await Promise.all([
    ready.supabase
      .from("colleges")
      .select("id, name, city, state_code, slug")
      .eq("market_status", "active")
      .order("name"),
    ready.supabase.from("states").select("code, name").order("name"),
  ])
  if (schemaMissing(colleges.error) || schemaMissing(states.error) || !colleges.data || !states.data) {
    return { ok: false }
  }
  return {
    ok: true,
    colleges: colleges.data.map((college) => ({
      id: college.id,
      name: college.name,
      city: college.city,
      stateCode: college.state_code,
      slug: college.slug,
    })),
    states: states.data.map((state) => ({ code: state.code, name: state.name })),
  }
}

export async function loadDashboard(): Promise<
  { ok: true; listings: DashboardListing[] } | { ok: false }
> {
  const ready = await client()
  if (!ready) return { ok: false }
  const ids = await ready.supabase.rpc("host_listing_ids")
  if (schemaMissing(ids.error)) return { ok: false }
  const listingIds = (ids.data ?? [])
    .map((row: { listing_id: string }) => row.listing_id)
    .filter((id: string) => Boolean(id))
  if (ids.error || listingIds.length === 0) return { ok: true, listings: [] }
  const { data, error } = await ready.supabase
    .from("listings")
    .select(
      "id, slug, title, status, city, state, neighborhood, price_cents, price_unit, updated_at, listing_photos(id, path, alt, sort_order, is_primary)",
    )
    .in("id", listingIds)
    .eq("is_demo", false)
    .order("updated_at", { ascending: false })
  if (schemaMissing(error)) return { ok: false }
  if (error || !data) return { ok: true, listings: [] }
  return {
    ok: true,
    listings: data.map((row) => {
      const photos = [...(row.listing_photos ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order || a.path.localeCompare(b.path),
      )
      const cover = photos.find((photo) => photo.is_primary) ?? photos[0]
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        status: row.status,
        city: row.city,
        stateCode: row.state,
        neighborhood: row.neighborhood,
        priceCents: row.price_cents,
        priceUnit: row.price_unit,
        image: cover ? publicPhotoSrc(cover) : null,
        imageAlt: cover?.alt ?? "",
      }
    }),
  }
}

export async function loadListing(id: string): Promise<
  { ok: true; listing: HostListing } | { ok: false; missing: true } | { ok: false; missing: false }
> {
  const ready = await client()
  if (!ready) return { ok: false, missing: false }
  const owned = await ready.supabase.rpc("listing_is_host_owned", { target: id })
  if (schemaMissing(owned.error)) return { ok: false, missing: false }
  if (owned.error || owned.data !== true) return { ok: false, missing: true }
  const { data, error } = await ready.supabase
    .from("listings")
    .select(
      "id, slug, title, summary, description, category, space_type, neighborhood, city, state, price_cents, price_unit, capacity_label, available_from, available_until, dates_confirmed, amenities, restrictions, sample_host_label, status, updated_at, listing_private(address_line, access_notes), listing_colleges(college_id, is_primary), listing_photos(id, path, alt, sort_order, is_primary), listing_blocked_dates(id, starts_on, ends_on)",
    )
    .eq("id", id)
    .eq("is_demo", false)
    .maybeSingle()
  if (schemaMissing(error)) return { ok: false, missing: false }
  if (error || !data) return { ok: false, missing: true }
  const notes = Array.isArray(data.listing_private) ? data.listing_private[0] : data.listing_private
  const college = (data.listing_colleges ?? []).find((item) => item.is_primary)
  return {
    ok: true,
    listing: {
      id: data.id,
      slug: data.slug,
      title: data.title,
      summary: data.summary,
      description: data.description,
      category: data.category,
      spaceType: data.space_type,
      neighborhood: data.neighborhood,
      city: data.city,
      stateCode: data.state,
      price: data.dates_confirmed || data.price_cents > 0 ? dollarsFromCents(data.price_cents) : "",
      priceUnit: data.price_unit,
      capacityLabel: data.capacity_label,
      availableFrom: data.dates_confirmed ? data.available_from : "",
      availableUntil: data.dates_confirmed ? data.available_until : "",
      datesConfirmed: data.dates_confirmed,
      amenities: data.amenities ?? "",
      restrictions: data.restrictions ?? "",
      hostLabel: data.sample_host_label,
      status: data.status,
      updatedAt: data.updated_at,
      addressLine: notes?.address_line ?? "",
      accessNotes: notes?.access_notes ?? "",
      collegeId: college?.college_id ?? "",
      photos: [...(data.listing_photos ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((photo) => ({
          id: photo.id,
          path: photo.path,
          alt: photo.alt,
          sortOrder: photo.sort_order,
          isPrimary: photo.is_primary,
        })),
      blocks: [...(data.listing_blocked_dates ?? [])]
        .sort((a, b) => a.starts_on.localeCompare(b.starts_on))
        .map((block) => ({ id: block.id, startsOn: block.starts_on, endsOn: block.ends_on })),
    },
  }
}
