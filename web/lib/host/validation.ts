import { categories, priceUnits, type CategoryId, type PriceUnit } from "@/lib/catalog"

const categoryIds = new Set<string>(categories.map((category) => category.id))
const unitIds = new Set<string>(priceUnits)

export type FieldErrors = Record<string, string>

export type ListingInput = {
  title: string
  summary: string
  description: string
  category: string
  spaceType: string
  neighborhood: string
  city: string
  stateCode: string
  price: string
  priceUnit: string
  capacityLabel: string
  availableFrom: string
  availableUntil: string
  collegeId: string
  addressLine: string
  accessNotes: string
  amenities: string
  restrictions: string
  hostLabel: string
}

export type NormalizedListing = {
  title: string
  summary: string
  description: string
  category: CategoryId
  spaceType: string
  neighborhood: string
  city: string
  stateCode: string
  priceCents: number
  priceUnit: PriceUnit
  capacityLabel: string
  availableFrom: string
  availableUntil: string
  datesConfirmed: boolean
  collegeId: string
  addressLine: string
  accessNotes: string
  amenities: string
  restrictions: string
  hostLabel: string
}

export function listingSlug(title: string, id: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "")
  const suffix = id.replace(/-/g, "").slice(0, 8)
  return `${base || "space"}-${suffix}`
}

export function parsePriceDollars(value: string): { ok: true; cents: number } | { ok: false; error: string } {
  const trimmed = value.trim()
  if (!trimmed) return { ok: true, cents: 0 }
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, error: "Enter a price like 145 or 145.00." }
  }
  const cents = Math.round(Number(trimmed) * 100)
  if (cents > 100_000_00) return { ok: false, error: "That price is too high." }
  return { ok: true, cents }
}

export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function parseDateRange(
  start: string,
  end: string,
): { ok: true; start: string; end: string } | { ok: false; error: string } {
  if (!isRealDate(start) || !isRealDate(end)) {
    return { ok: false, error: "Use real calendar dates." }
  }
  if (end < start) return { ok: false, error: "The end date is before the start date." }
  return { ok: true, start, end }
}

export function rangesOverlap(
  left: { start: string; end: string },
  right: { start: string; end: string },
): boolean {
  return left.start <= right.end && right.start <= left.end
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max)
}

export function parseListingDraft(
  input: ListingInput,
): { ok: true; value: NormalizedListing } | { ok: false; fieldErrors: FieldErrors } {
  const fieldErrors: FieldErrors = {}
  const title = clip(input.title, 80)
  if (!title) fieldErrors.title = "Add a title to save a draft."

  const category = input.category.trim()
  if (!categoryIds.has(category)) fieldErrors.category = "Choose a category."

  const priceUnit = input.priceUnit.trim()
  if (!unitIds.has(priceUnit)) fieldErrors.priceUnit = "Choose a price unit."

  const price = parsePriceDollars(input.price)
  const priceCents = price.ok ? price.cents : 0
  if (!price.ok) fieldErrors.price = price.error

  const from = input.availableFrom.trim()
  const until = input.availableUntil.trim()
  let availableFrom = "2026-01-01"
  let availableUntil = "2026-01-01"
  let datesConfirmed = false
  if (from || until) {
    const range = parseDateRange(from, until)
    if (!range.ok) fieldErrors.availableFrom = range.error
    else {
      availableFrom = range.start
      availableUntil = range.end
      datesConfirmed = true
    }
  }

  const stateCode = input.stateCode.trim().toUpperCase()
  if (stateCode && !/^[A-Z]{2}$/.test(stateCode)) fieldErrors.stateCode = "Choose a state."

  const hostLabel = clip(input.hostLabel, 40) || "Host"
  const collegeId = input.collegeId.trim()
  if (collegeId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(collegeId)) {
    fieldErrors.collegeId = "Choose a college market."
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }

  return {
    ok: true,
    value: {
      title,
      summary: clip(input.summary, 280),
      description: clip(input.description, 4000),
      category: category as CategoryId,
      spaceType: clip(input.spaceType, 40),
      neighborhood: clip(input.neighborhood, 80),
      city: clip(input.city, 80),
      stateCode,
      priceCents,
      priceUnit: priceUnit as PriceUnit,
      capacityLabel: clip(input.capacityLabel, 80),
      availableFrom,
      availableUntil,
      datesConfirmed,
      collegeId,
      addressLine: clip(input.addressLine, 200),
      accessNotes: clip(input.accessNotes, 1000),
      amenities: clip(input.amenities, 500),
      restrictions: clip(input.restrictions, 500),
      hostLabel,
    },
  }
}

export function publishFieldErrors(
  value: NormalizedListing,
  extras: { photoCount: number; collegeIsActive: boolean },
): FieldErrors {
  const fieldErrors: FieldErrors = {}
  if (value.summary.length < 20) fieldErrors.summary = "Add a short summary of at least 20 characters."
  if (value.description.length < 40) fieldErrors.description = "Describe the space in at least 40 characters."
  if (!value.spaceType) fieldErrors.spaceType = "Say what kind of space this is."
  if (!value.neighborhood) fieldErrors.neighborhood = "Add a neighborhood or area."
  if (!value.city) fieldErrors.city = "Add a city."
  if (!/^[A-Z]{2}$/.test(value.stateCode)) fieldErrors.stateCode = "Choose a state."
  if (!value.capacityLabel) fieldErrors.capacityLabel = "Say what fits."
  if (value.priceCents <= 0) fieldErrors.price = "Enter a price above zero."
  if (!value.datesConfirmed) fieldErrors.availableFrom = "Add the first and last dates the space can be offered."
  if (!value.collegeId || !extras.collegeIsActive) {
    fieldErrors.collegeId = "Choose an open college market. University of Michigan–Ann Arbor is the one that is open."
  }
  if (!value.addressLine) fieldErrors.addressLine = "Add the street address. It stays off the public page."
  if (extras.photoCount < 1) fieldErrors.photos = "Add at least one photo before publishing."
  return fieldErrors
}

export function firstFieldError(fieldErrors: FieldErrors): string {
  return Object.values(fieldErrors)[0] ?? "Check the highlighted fields."
}

export function dollarsFromCents(cents: number): string {
  if (!cents) return ""
  const dollars = cents / 100
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2)
}

const JPEG = [0xff, 0xd8, 0xff]
const PNG = [0x89, 0x50, 0x4e, 0x47]

export function sniffImage(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes.length < 12) return null
  if (JPEG.every((byte, index) => bytes[index] === byte)) return "jpg"
  if (PNG.every((byte, index) => bytes[index] === byte)) return "png"
  const riff = String.fromCharCode(...bytes.slice(0, 4))
  const webp = String.fromCharCode(...bytes.slice(8, 12))
  if (riff === "RIFF" && webp === "WEBP") return "webp"
  return null
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_LISTING_PHOTOS = 8

const photoIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Public pages only receive a static demo path or an id-scoped photo route. */
export function publicPhotoSrc(photo: { id?: string; path: string }): string {
  if (photo.path.startsWith("/images/") && !photo.path.includes("..")) return photo.path
  if (photo.id && photoIdPattern.test(photo.id)) return `/listing-photos/${photo.id}`
  throw new Error("Listing photo is not public")
}
