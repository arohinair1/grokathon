import { describe, expect, it } from "vitest"
import { matchListings, relaxations } from "@/lib/spacematch/match"
import type { SpaceRequirements } from "@/lib/spacematch/types"

const summer: SpaceRequirements = {
  need: "storage",
  from: "2027-05-01",
  until: "2027-08-31",
  datesAreExact: false,
  items: [
    { label: "mini-fridge", quantity: 1, kind: "miniFridge" },
    { label: "suitcase", quantity: 2, kind: "luggage" },
    { label: "moving box", quantity: 4, kind: "boxes" },
  ],
  capacityCuFtMin: 24,
  capacityCuFtMax: 46,
  capacityAssumptions: "Estimate only.",
  neighborhood: "Old Campus",
  budgetCents: 10000,
  budgetPeriod: "month",
  accessNotes: null,
  vehicleSize: null,
  missing: [],
}

describe("yale matching", () => {
  it("returns only catalog listings that satisfy every hard constraint", () => {
    const result = matchListings(summer)
    expect(result.matches.map((match) => match.listing.id)).toEqual(["old-campus-summer-storage"])
    expect(result.matches.every((match) => match.listing.market === "yale" && match.listing.demo)).toBe(true)
  })

  it("does not treat a past summer window as available", () => {
    const result = matchListings({ ...summer, from: "2026-05-01", until: "2026-08-31" })
    expect(result.matches).toEqual([])
    expect(relaxations({ ...summer, from: "2026-05-01", until: "2026-08-31" }).some((idea) => idea.constraint === "dates")).toBe(true)
  })

  it("keeps an under-budget follow-up from reviving a more expensive space", () => {
    const result = matchListings({ ...summer, budgetCents: 8000 })
    expect(result.matches).toEqual([])
  })

  it("matches covered parking near Science Hill when the dates and budget fit", () => {
    const result = matchListings({
      ...summer,
      need: "parking",
      items: [{ label: "car", quantity: 1, kind: "vehicle" }],
      capacityCuFtMin: null,
      capacityCuFtMax: null,
      neighborhood: "Science Hill",
      budgetCents: 15000,
      from: "2027-01-01",
      until: "2027-05-31",
      vehicleSize: "standard",
    })
    expect(result.matches.map((match) => match.listing.id)).toContain("science-hill-covered-parking")
    expect(result.matches.every((match) => match.listing.category === "monthly-parking")).toBe(true)
  })
})
