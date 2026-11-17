import { describe, expect, it } from "vitest"
import {
  filterListings,
  formatPrice,
  isIsoDate,
  listingSearchOr,
  listings,
  parseCatalogQuery,
  sampleHostSentence,
} from "./catalog"

describe("parseCatalogQuery", () => {
  it("drops unknown categories, neighborhoods, and impossible dates", () => {
    expect(
      parseCatalogQuery({
        category: "yacht",
        neighborhood: "Mars",
        from: "2026-02-31",
        until: "soon",
        q: "garage%",
      }),
    ).toEqual({ category: "", neighborhood: "", from: "", until: "", q: "garage" })
  })

  it("keeps a valid search", () => {
    expect(
      parseCatalogQuery({
        category: "storage",
        neighborhood: "Kerrytown",
        from: "2026-06-01",
        until: "2026-07-01",
        q: "  lockable garage  ",
      }),
    ).toEqual({
      category: "storage",
      neighborhood: "Kerrytown",
      from: "2026-06-01",
      until: "2026-07-01",
      q: "lockable garage",
    })
  })
})

describe("filterListings", () => {
  it("returns the full demo catalog when the query is empty", () => {
    const result = filterListings(listings, {
      category: "",
      neighborhood: "",
      from: "",
      until: "",
      q: "",
    })
    expect(result).toHaveLength(listings.length)
    expect(result.every((listing) => listing.demo)).toBe(true)
  })

  it("matches category and neighborhood together", () => {
    const result = filterListings(listings, {
      category: "storage",
      neighborhood: "Kerrytown",
      from: "",
      until: "",
      q: "",
    })
    expect(result.map((listing) => listing.id)).toEqual(["kerrytown-garage"])
  })

  it("keeps a listing only when the requested dates sit inside its window", () => {
    const result = filterListings(listings, {
      category: "monthly-parking",
      neighborhood: "Burns Park",
      from: "2026-09-01",
      until: "2026-12-01",
      q: "",
    })
    expect(result.map((listing) => listing.id)).toEqual(["burns-park-driveway"])
  })

  it("rejects a stay that runs past the listing window", () => {
    const result = filterListings(listings, {
      category: "",
      neighborhood: "Kerrytown",
      from: "2026-05-01",
      until: "2026-09-01",
      q: "",
    })
    expect(result).toEqual([])
  })

  it("rejects a reversed pair that extends past the window", () => {
    const result = filterListings(listings, {
      category: "university-event",
      neighborhood: "",
      from: "2027-05-10",
      until: "2027-05-01",
      q: "",
    })
    expect(result).toEqual([])
  })

  it("rejects a range that starts before the window", () => {
    const result = filterListings(listings, {
      category: "",
      neighborhood: "Kerrytown",
      from: "2026-04-15",
      until: "2026-06-01",
      q: "",
    })
    expect(result).toEqual([])
  })

  it("rejects a lone date outside the window", () => {
    const fromOnly = filterListings(listings, {
      category: "university-event",
      neighborhood: "",
      from: "2027-06-01",
      until: "",
      q: "",
    })
    const untilOnly = filterListings(listings, {
      category: "university-event",
      neighborhood: "",
      from: "",
      until: "2027-06-01",
      q: "",
    })
    expect(fromOnly).toEqual([])
    expect(untilOnly).toEqual([])
  })

  it("includes the first and last day of a listing window", () => {
    const result = filterListings(listings, {
      category: "university-event",
      neighborhood: "",
      from: "2027-04-30",
      until: "2027-05-03",
      q: "",
    })
    expect(result.map((listing) => listing.id)).toEqual(["packard-graduation"])
  })

  it("accepts a single day and a reversed date pair", () => {
    const day = filterListings(listings, {
      category: "university-event",
      neighborhood: "",
      from: "2027-05-01",
      until: "",
      q: "",
    })
    expect(day.map((listing) => listing.id)).toEqual(["packard-graduation"])

    const reversed = filterListings(listings, {
      category: "university-event",
      neighborhood: "",
      from: "2027-05-03",
      until: "2027-04-30",
      q: "",
    })
    expect(reversed.map((listing) => listing.id)).toEqual(["packard-graduation"])
  })

  it("matches title, summary, or description without matching a private field", () => {
    const base = { category: "" as const, neighborhood: "" as const, from: "", until: "" }
    expect(filterListings(listings, { ...base, q: "LOCKABLE" }).map((listing) => listing.id)).toEqual([
      "kerrytown-garage",
    ])
    expect(filterListings(listings, { ...base, q: "summer lease gap" }).map((listing) => listing.id)).toEqual([
      "kerrytown-garage",
    ])
    expect(filterListings(listings, { ...base, q: "submarine" })).toEqual([])
    expect(
      filterListings(listings, { ...base, category: "storage", q: "kerrytown" }).map((listing) => listing.id),
    ).toEqual(["kerrytown-garage"])
  })
})

describe("listingSearchOr", () => {
  it("builds one published-text filter and drops wildcards", () => {
    expect(listingSearchOr("  lockable garage % ")).toBe(
      'title.ilike."*lockable garage*",summary.ilike."*lockable garage*",description.ilike."*lockable garage*"',
    )
    expect(listingSearchOr(" % ")).toBeNull()
    expect(listingSearchOr("")).toBeNull()
    expect(listingSearchOr('garage",status.eq.draft,(or)')).toBe(
      'title.ilike."*garage status eq draft or*",summary.ilike."*garage status eq draft or*",description.ilike."*garage status eq draft or*"',
    )
  })
})

describe("sampleHostSentence", () => {
  it("does not add a second period after an initial", () => {
    expect(sampleHostSentence("Marcus L.", "May 1, 2026 – Aug 20, 2026")).toBe(
      "Sample host: Marcus L. Available May 1, 2026 – Aug 20, 2026.",
    )
    expect(sampleHostSentence("Helen C.", "May 4, 2026 – Aug 22, 2026")).not.toContain("..")
  })
})

describe("formatPrice", () => {
  it("formats whole dollars with the listing unit", () => {
    expect(formatPrice(14500, "month")).toBe("$145 / month")
    expect(formatPrice(5500, "event")).toBe("$55 / event")
  })
})

describe("isIsoDate", () => {
  it("rejects dates that are not real calendar days", () => {
    expect(isIsoDate("2026-02-31")).toBe(false)
    expect(isIsoDate("2026-09-05")).toBe(true)
  })
})
