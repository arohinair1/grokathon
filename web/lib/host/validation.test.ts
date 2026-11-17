import { describe, expect, it } from "vitest"
import {
  listingSlug,
  parseDateRange,
  parseListingDraft,
  parsePriceDollars,
  publicPhotoSrc,
  publishFieldErrors,
  rangesOverlap,
  sniffImage,
  type NormalizedListing,
} from "@/lib/host/validation"

const ready: NormalizedListing = {
  title: "Driveway on Packard",
  summary: "A flat two-car driveway a short walk from campus.",
  description: "The driveway is paved, level, and empty on weekdays during the semester.",
  category: "monthly-parking",
  spaceType: "Driveway",
  neighborhood: "Burns Park",
  city: "Ann Arbor",
  stateCode: "MI",
  priceCents: 14500,
  priceUnit: "month",
  capacityLabel: "Two cars",
  availableFrom: "2026-09-01",
  availableUntil: "2026-12-15",
  datesConfirmed: true,
  collegeId: "a0000000-0000-4000-8000-000000000001",
  addressLine: "100 Packard St",
  accessNotes: "Gate code 1234",
  amenities: "Level pavement",
  restrictions: "No overnight RVs",
  hostLabel: "Host",
}

describe("listing drafts", () => {
  it("saves a title without inventing a public price", () => {
    const parsed = parseListingDraft({
      title: "  Side drive  ",
      summary: "",
      description: "",
      category: "storage",
      spaceType: "",
      neighborhood: "",
      city: "",
      stateCode: "",
      price: "",
      priceUnit: "month",
      capacityLabel: "",
      availableFrom: "",
      availableUntil: "",
      collegeId: "",
      addressLine: "",
      accessNotes: "",
      amenities: "",
      restrictions: "",
      hostLabel: "",
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.title).toBe("Side drive")
    expect(parsed.value.priceCents).toBe(0)
    expect(parsed.value.datesConfirmed).toBe(false)
    expect(parsed.value.hostLabel).toBe("Host")
  })

  it("rejects a price that is not a dollar amount", () => {
    expect(parsePriceDollars("14.5.0").ok).toBe(false)
    expect(parsePriceDollars("-5").ok).toBe(false)
    expect(parsePriceDollars("145.555").ok).toBe(false)
    expect(parsePriceDollars("145.5")).toEqual({ ok: true, cents: 14550 })
    expect(parsePriceDollars("145.50")).toEqual({ ok: true, cents: 14550 })
  })

  it("keeps a slug stable and safe", () => {
    expect(listingSlug("Two-car driveway on Olivia!", "a0000000-0000-4000-8000-00000000000a")).toBe(
      "two-car-driveway-on-olivia-a0000000",
    )
    expect(listingSlug("!!!", "a0000000-0000-4000-8000-00000000000a")).toBe("space-a0000000")
  })
})

describe("publishing", () => {
  it("requires an active market, a photo, and a private address", () => {
    const errors = publishFieldErrors(
      { ...ready, addressLine: "", collegeId: "" },
      { photoCount: 0, collegeIsActive: false },
    )
    expect(errors.addressLine).toBeTruthy()
    expect(errors.collegeId).toBeTruthy()
    expect(errors.photos).toBeTruthy()
    expect(publishFieldErrors(ready, { photoCount: 1, collegeIsActive: true })).toEqual({})
  })

  it("does not treat a planned market as publishable", () => {
    const errors = publishFieldErrors(ready, { photoCount: 1, collegeIsActive: false })
    expect(errors.collegeId).toMatch(/open college market/)
  })
})

describe("blocked dates", () => {
  it("rejects impossible and reversed ranges", () => {
    expect(parseDateRange("2026-02-31", "2026-03-01").ok).toBe(false)
    expect(parseDateRange("2026-05-02", "2026-05-01").ok).toBe(false)
    expect(parseDateRange("2026-05-01", "2026-05-01")).toEqual({
      ok: true,
      start: "2026-05-01",
      end: "2026-05-01",
    })
  })

  it("treats inclusive dates as overlapping", () => {
    expect(rangesOverlap({ start: "2026-05-01", end: "2026-05-03" }, { start: "2026-05-03", end: "2026-05-04" })).toBe(
      true,
    )
    expect(rangesOverlap({ start: "2026-05-01", end: "2026-05-02" }, { start: "2026-05-03", end: "2026-05-04" })).toBe(
      false,
    )
  })
})

describe("photos", () => {
  it("recognizes jpeg, png, and webp bytes", () => {
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("jpg")
    expect(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("png")
    const webp = new Uint8Array(12)
    webp.set([0x52, 0x49, 0x46, 0x46], 0)
    webp.set([0x57, 0x45, 0x42, 0x50], 8)
    expect(sniffImage(webp)).toBe("webp")
    expect(sniffImage(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))).toBeNull()
  })

  it("does not turn a storage key into a public url", () => {
    expect(publicPhotoSrc({ path: "/images/garage-workshop.jpg" })).toBe("/images/garage-workshop.jpg")
    expect(publicPhotoSrc({ id: "a0000000-0000-4000-8000-000000000001", path: "listing/photo.jpg" })).toBe(
      "/listing-photos/a0000000-0000-4000-8000-000000000001",
    )
    expect(() => publicPhotoSrc({ path: "https://example.test/secret.jpg" })).toThrow()
    expect(() => publicPhotoSrc({ path: "/images/../secret.jpg" })).toThrow()
  })
})
