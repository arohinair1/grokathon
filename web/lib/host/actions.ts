"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  firstFieldError,
  listingSlug,
  MAX_LISTING_PHOTOS,
  MAX_PHOTO_BYTES,
  parseDateRange,
  parseListingDraft,
  publishFieldErrors,
  rangesOverlap,
  sniffImage,
  type FieldErrors,
  type ListingInput,
  type NormalizedListing,
} from "@/lib/host/validation"
import { createServerAuthClient } from "@/lib/supabase/server"

export type HostFormState = {
  error?: string
  fieldErrors?: FieldErrors
  message?: string
}

type HostClient = NonNullable<Awaited<ReturnType<typeof createServerAuthClient>>>

const SCHEMA_ERROR = "Hosting isn’t available until the database update is applied."

function readInput(formData: FormData): ListingInput {
  const read = (key: string) => String(formData.get(key) ?? "")
  return {
    title: read("title"),
    summary: read("summary"),
    description: read("description"),
    category: read("category"),
    spaceType: read("space_type"),
    neighborhood: read("neighborhood"),
    city: read("city"),
    stateCode: read("state_code"),
    price: read("price"),
    priceUnit: read("price_unit"),
    capacityLabel: read("capacity_label"),
    availableFrom: read("available_from"),
    availableUntil: read("available_until"),
    collegeId: read("college_id"),
    addressLine: read("address_line"),
    accessNotes: read("access_notes"),
    amenities: read("amenities"),
    restrictions: read("restrictions"),
    hostLabel: read("host_label"),
  }
}

function schemaMissing(error: { code?: string } | null): boolean {
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST202" ||
    error?.code === "PGRST204" ||
    error?.code === "PGRST205"
  )
}

async function requireOwned(
  supabase: HostClient,
  id: string,
): Promise<"ok" | "unavailable" | "denied"> {
  const { data, error } = await supabase.rpc("listing_is_host_owned", { target: id })
  if (schemaMissing(error)) return "unavailable"
  if (error || data !== true) return "denied"
  return "ok"
}

async function photoIsStored(
  supabase: HostClient,
  path: string,
): Promise<"stored" | "missing" | "unavailable"> {
  if (path.startsWith("/images/") && !path.includes("..")) return "stored"
  try {
    const result = await supabase.storage.from("listing-photos").exists(path)
    if (result.data === true) return "stored"
    const status = result.error && "status" in result.error ? result.error.status : undefined
    if (status === 400 || status === 404) return "missing"
    return "unavailable"
  } catch {
    return "unavailable"
  }
}

async function hostClient(): Promise<{ supabase: HostClient; userId: string } | HostFormState> {
  const supabase = await createServerAuthClient()
  if (!supabase) return { error: SCHEMA_ERROR }
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect("/login?next=/host")
  return { supabase, userId: data.user.id }
}

function isState(value: { supabase: HostClient; userId: string } | HostFormState): value is HostFormState {
  return !("supabase" in value)
}

async function collegeState(
  supabase: HostClient,
  collegeId: string,
): Promise<"empty" | "missing" | "active" | "inactive" | "unavailable"> {
  if (!collegeId) return "empty"
  const { data, error } = await supabase
    .from("colleges")
    .select("market_status")
    .eq("id", collegeId)
    .maybeSingle()
  if (schemaMissing(error)) return "unavailable"
  if (error) return "missing"
  if (!data) return "missing"
  return data.market_status === "active" ? "active" : "inactive"
}

function listingPatch(value: NormalizedListing) {
  return {
    title: value.title,
    summary: value.summary,
    description: value.description,
    category: value.category,
    space_type: value.spaceType,
    neighborhood: value.neighborhood,
    city: value.city,
    state: value.stateCode,
    price_cents: value.priceCents,
    price_unit: value.priceUnit,
    capacity_label: value.capacityLabel,
    available_from: value.availableFrom,
    available_until: value.availableUntil,
    dates_confirmed: value.datesConfirmed,
    sample_host_label: value.hostLabel,
    amenities: value.amenities,
    restrictions: value.restrictions,
  }
}

async function writeDetails(supabase: HostClient, id: string, value: NormalizedListing): Promise<HostFormState | null> {
  const college = await collegeState(supabase, value.collegeId)
  if (college === "unavailable") return { error: SCHEMA_ERROR }
  if (college === "missing" && value.collegeId) {
    return { fieldErrors: { collegeId: "Choose a college market." }, error: "Choose a college market." }
  }
  const saved = await supabase.rpc("host_set_listing_facts", {
    p_listing: id,
    p_college: value.collegeId || null,
    p_address: value.addressLine,
    p_notes: value.accessNotes,
  })
  if (!saved.error) return null
  if (saved.error.code === "23514") {
    return { error: "A published listing needs a private address and an open college market." }
  }
  if (schemaMissing(saved.error)) return { error: SCHEMA_ERROR }
  return { error: "The private address could not be saved." }
}

export async function createListingAction(
  _state: HostFormState,
  formData: FormData,
): Promise<HostFormState> {
  const ready = await hostClient()
  if (isState(ready)) return ready
  const parsed = parseListingDraft(readInput(formData))
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, error: firstFieldError(parsed.fieldErrors) }

  const inserted = await ready.supabase
    .from("listings")
    .insert({
      ...listingPatch(parsed.value),
      owner_id: ready.userId,
      slug: `draft-${crypto.randomUUID()}`,
      featured: false,
      is_demo: false,
      status: "draft",
      sort_order: 500,
    })
    .select("id")
    .single()
  if (inserted.error || !inserted.data) {
    return { error: schemaMissing(inserted.error) ? SCHEMA_ERROR : "The draft could not be saved." }
  }
  const id = inserted.data.id as string
  await ready.supabase.from("listings").update({ slug: listingSlug(parsed.value.title, id) }).eq("id", id).eq("is_demo", false)
  const details = await writeDetails(ready.supabase, id, parsed.value)
  if (details) return details
  redirect(`/host/listings/${id}/edit`)
}

export async function saveListingAction(
  _state: HostFormState,
  formData: FormData,
): Promise<HostFormState> {
  const ready = await hostClient()
  if (isState(ready)) return ready
  const id = String(formData.get("listing_id") ?? "")
  const owned = await requireOwned(ready.supabase, id)
  if (owned === "unavailable") return { error: SCHEMA_ERROR }
  if (owned === "denied") return { error: "That listing is not yours." }
  const parsed = parseListingDraft(readInput(formData))
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, error: firstFieldError(parsed.fieldErrors) }
  const details = await writeDetails(ready.supabase, id, parsed.value)
  if (details) return details

  const saved = await ready.supabase
    .from("listings")
    .update({ ...listingPatch(parsed.value), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_demo", false)
    .select("id")
  if (saved.error || !saved.data?.length) {
    if (`${saved.error?.message ?? ""}`.includes("accepted_reservation")) {
      return { error: "Those dates include an accepted request. Widen the window or leave it as it is." }
    }
    if (saved.error?.code === "23514") {
      return { error: "This published listing no longer meets the publishing rules." }
    }
    return { error: schemaMissing(saved.error) ? SCHEMA_ERROR : "The draft could not be saved." }
  }
  revalidatePath("/host")
  revalidatePath(`/host/listings/${id}/edit`)
  return { message: "Draft saved." }
}

export async function publishListingAction(
  _state: HostFormState,
  formData: FormData,
): Promise<HostFormState> {
  const ready = await hostClient()
  if (isState(ready)) return ready
  const id = String(formData.get("listing_id") ?? "")
  const owned = await requireOwned(ready.supabase, id)
  if (owned === "unavailable") return { error: SCHEMA_ERROR }
  if (owned === "denied") return { error: "That listing is not yours." }
  const loaded = await ready.supabase
    .from("listings")
    .select(
      "id, slug, title, summary, description, category, space_type, neighborhood, city, state, price_cents, price_unit, capacity_label, available_from, available_until, dates_confirmed, amenities, restrictions, sample_host_label, listing_private(address_line, access_notes), listing_colleges(college_id, is_primary), listing_photos(id, path)",
    )
    .eq("id", id)
    .eq("is_demo", false)
    .maybeSingle()
  if (loaded.error || !loaded.data) return { error: schemaMissing(loaded.error) ? SCHEMA_ERROR : "That listing is not yours." }

  const row = loaded.data
  const privateRow = firstRelation(row.listing_private)
  const college = (row.listing_colleges ?? []).find((item: { is_primary: boolean }) => item.is_primary)
  const collegeId = college?.college_id ?? ""
  const active = (await collegeState(ready.supabase, collegeId)) === "active"
  const value: NormalizedListing = {
    title: row.title,
    summary: row.summary,
    description: row.description,
    category: row.category,
    spaceType: row.space_type,
    neighborhood: row.neighborhood,
    city: row.city,
    stateCode: row.state,
    priceCents: row.price_cents,
    priceUnit: row.price_unit,
    capacityLabel: row.capacity_label,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    datesConfirmed: row.dates_confirmed,
    collegeId,
    addressLine: privateRow?.address_line ?? "",
    accessNotes: privateRow?.access_notes ?? "",
    amenities: row.amenities ?? "",
    restrictions: row.restrictions ?? "",
    hostLabel: row.sample_host_label,
  }
  const fieldErrors = publishFieldErrors(value, {
    photoCount: row.listing_photos?.length ?? 0,
    collegeIsActive: active,
  })
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: firstFieldError(fieldErrors) }
  }
  for (const photo of row.listing_photos ?? []) {
    const stored = await photoIsStored(ready.supabase, photo.path)
    if (stored === "unavailable") {
      return { error: "The photo could not be confirmed in storage. Storage for listing photos is not ready yet." }
    }
    if (stored === "missing") {
      return { error: "Upload each photo before publishing. A photo row alone is not enough." }
    }
  }

  const published = await ready.supabase
    .from("listings")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_demo", false)
    .select("slug")
  if (published.error || !published.data?.length) return { error: "The listing could not be published." }
  const slug = published.data[0].slug as string
  revalidatePath("/search")
  revalidatePath(`/listings/${slug}`)
  revalidatePath("/host")
  return { message: "Published. It is now in the Ann Arbor catalog." }
}

export async function unpublishListingAction(
  _state: HostFormState,
  formData: FormData,
): Promise<HostFormState> {
  const ready = await hostClient()
  if (isState(ready)) return ready
  const id = String(formData.get("listing_id") ?? "")
  const owned = await requireOwned(ready.supabase, id)
  if (owned !== "ok") return { error: owned === "unavailable" ? SCHEMA_ERROR : "The listing could not be unpublished." }
  const saved = await ready.supabase
    .from("listings")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_demo", false)
    .select("slug")
  if (saved.error || !saved.data?.length) return { error: "The listing could not be unpublished." }
  revalidatePath("/search")
  revalidatePath(`/listings/${saved.data[0].slug}`)
  revalidatePath("/host")
  return { message: "Unpublished. It is hidden from search." }
}

export async function deleteDraftAction(formData: FormData) {
  const ready = await hostClient()
  if (isState(ready)) return
  const id = String(formData.get("listing_id") ?? "")
  if ((await requireOwned(ready.supabase, id)) !== "ok") return
  const photos = await ready.supabase.from("listing_photos").select("path").eq("listing_id", id)
  const removed = await ready.supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("status", "draft")
    .eq("is_demo", false)
    .select("id")
  if (removed.error?.code === "23503") {
    redirect(`/host/listings/${id}/edit?notice=requests`)
  }
  if (!removed.error && removed.data?.length) {
    const paths = (photos.data ?? []).map((photo) => photo.path).filter((path) => !path.startsWith("/"))
    if (paths.length > 0) await ready.supabase.storage.from("listing-photos").remove(paths)
    revalidatePath("/host")
    redirect("/host")
  }
}

export async function uploadPhotoAction(
  _state: HostFormState,
  formData: FormData,
): Promise<HostFormState> {
  const ready = await hostClient()
  if (isState(ready)) return ready
  const listingId = String(formData.get("listing_id") ?? "")
  const owned = await requireOwned(ready.supabase, listingId)
  if (owned === "unavailable") return { error: SCHEMA_ERROR }
  if (owned === "denied") return { error: "That listing is not yours." }

  const file = formData.get("photo")
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo." }
  if (file.size > MAX_PHOTO_BYTES) return { error: "Photos must be 5 MB or smaller." }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = sniffImage(bytes)
  if (!kind) return { error: "Use a JPEG, PNG, or WebP photo." }

  const existing = await ready.supabase
    .from("listing_photos")
    .select("id, sort_order")
    .eq("listing_id", listingId)
  if (existing.error) return { error: "Photos could not be loaded." }
  if ((existing.data?.length ?? 0) >= MAX_LISTING_PHOTOS) return { error: "Eight photos is the limit." }

  const path = `${listingId}/${crypto.randomUUID()}.${kind}`
  const contentType = kind === "jpg" ? "image/jpeg" : kind === "png" ? "image/png" : "image/webp"
  const uploaded = await ready.supabase.storage.from("listing-photos").upload(path, bytes, {
    contentType,
    upsert: false,
  })
  if (uploaded.error) {
    return { error: "The photo could not be stored. Storage for listing photos is not ready yet." }
  }

  const alt = String(formData.get("alt") ?? "").trim().slice(0, 140) || "Space photo"
  const sortOrder = (existing.data ?? []).reduce((max, photo) => Math.max(max, photo.sort_order), -1) + 1
  const inserted = await ready.supabase.from("listing_photos").insert({
    listing_id: listingId,
    path,
    alt,
    sort_order: sortOrder,
    is_primary: (existing.data ?? []).length === 0,
  })
  if (inserted.error) {
    await ready.supabase.storage.from("listing-photos").remove([path])
    return { error: "The photo could not be saved." }
  }
  revalidatePath(`/host/listings/${listingId}/edit`)
  return { message: "Photo added." }
}

export async function deletePhotoAction(formData: FormData) {
  const ready = await hostClient()
  if (isState(ready)) return
  const listingId = String(formData.get("listing_id") ?? "")
  const photoId = String(formData.get("photo_id") ?? "")
  const photo = await ready.supabase
    .from("listing_photos")
    .select("id, path, is_primary")
    .eq("id", photoId)
    .eq("listing_id", listingId)
    .maybeSingle()
  if (!photo.data || (await requireOwned(ready.supabase, listingId)) !== "ok") return
  const removed = await ready.supabase
    .from("listing_photos")
    .delete()
    .eq("id", photoId)
    .eq("listing_id", listingId)
    .select("id")
  if (removed.error || !removed.data?.length) return
  if (!photo.data.path.startsWith("/")) {
    await ready.supabase.storage.from("listing-photos").remove([photo.data.path])
  }
  if (photo.data.is_primary) {
    const next = await ready.supabase
      .from("listing_photos")
      .select("id")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (next.data) {
      await ready.supabase.from("listing_photos").update({ is_primary: true }).eq("id", next.data.id)
    }
  }
  revalidatePath(`/host/listings/${listingId}/edit`)
}

export async function coverPhotoAction(formData: FormData) {
  const ready = await hostClient()
  if (isState(ready)) return
  const listingId = String(formData.get("listing_id") ?? "")
  const photoId = String(formData.get("photo_id") ?? "")
  if ((await requireOwned(ready.supabase, listingId)) !== "ok") return
  await ready.supabase.from("listing_photos").update({ is_primary: false }).eq("listing_id", listingId)
  await ready.supabase
    .from("listing_photos")
    .update({ is_primary: true })
    .eq("id", photoId)
    .eq("listing_id", listingId)
  revalidatePath(`/host/listings/${listingId}/edit`)
}

export async function movePhotoAction(formData: FormData) {
  const ready = await hostClient()
  if (isState(ready)) return
  const listingId = String(formData.get("listing_id") ?? "")
  const photoId = String(formData.get("photo_id") ?? "")
  if ((await requireOwned(ready.supabase, listingId)) !== "ok") return
  const direction = formData.get("direction") === "up" ? -1 : 1
  const photos = await ready.supabase
    .from("listing_photos")
    .select("id, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true })
  const rows = photos.data ?? []
  const index = rows.findIndex((photo) => photo.id === photoId)
  const swap = index + direction
  if (index < 0 || swap < 0 || swap >= rows.length) return
  const ordered = rows.slice()
  const [moved] = ordered.splice(index, 1)
  ordered.splice(swap, 0, moved)
  for (const [position, photo] of ordered.entries()) {
    await ready.supabase.from("listing_photos").update({ sort_order: 1000 + position }).eq("id", photo.id)
  }
  for (const [position, photo] of ordered.entries()) {
    await ready.supabase.from("listing_photos").update({ sort_order: position }).eq("id", photo.id)
  }
  revalidatePath(`/host/listings/${listingId}/edit`)
}

export async function addBlockedDatesAction(
  _state: HostFormState,
  formData: FormData,
): Promise<HostFormState> {
  const ready = await hostClient()
  if (isState(ready)) return ready
  const listingId = String(formData.get("listing_id") ?? "")
  const owned = await requireOwned(ready.supabase, listingId)
  if (owned === "unavailable") return { error: SCHEMA_ERROR }
  if (owned === "denied") return { error: "That listing is not yours." }

  const range = parseDateRange(String(formData.get("starts_on") ?? ""), String(formData.get("ends_on") ?? ""))
  if (!range.ok) return { error: range.error }
  const existing = await ready.supabase
    .from("listing_blocked_dates")
    .select("starts_on, ends_on")
    .eq("listing_id", listingId)
  if (existing.error) return { error: schemaMissing(existing.error) ? SCHEMA_ERROR : "Blocked dates could not be saved." }
  if (
    (existing.data ?? []).some((row) =>
      rangesOverlap({ start: row.starts_on, end: row.ends_on }, { start: range.start, end: range.end }),
    )
  ) {
    return { error: "That range overlaps a date you already blocked." }
  }
  const inserted = await ready.supabase.from("listing_blocked_dates").insert({
    listing_id: listingId,
    starts_on: range.start,
    ends_on: range.end,
  })
  if (inserted.error) {
    if (`${inserted.error.message ?? ""}`.includes("accepted_reservation")) {
      return { error: "An accepted request already uses those dates." }
    }
    if (`${inserted.error.message ?? ""}`.includes("blocked date limit")) {
      return { error: "This listing already has as many blocked ranges as it can hold." }
    }
    return { error: "Blocked dates could not be saved." }
  }
  revalidatePath("/search")
  return { message: "Those dates are blocked." }
}

export async function removeBlockedDatesAction(formData: FormData) {
  const ready = await hostClient()
  if (isState(ready)) return
  const listingId = String(formData.get("listing_id") ?? "")
  const blockId = String(formData.get("block_id") ?? "")
  if ((await requireOwned(ready.supabase, listingId)) !== "ok") return
  await ready.supabase.from("listing_blocked_dates").delete().eq("id", blockId).eq("listing_id", listingId)
  revalidatePath("/search")
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}
