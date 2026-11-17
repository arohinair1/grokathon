import { describe, expect, it } from "vitest"
import { interpretDates } from "@/lib/spacematch/assumptions"
import { guardRequirements } from "@/lib/spacematch/guard"
import { parseLocalRequirements } from "@/lib/spacematch/local-parse"

const demo =
  "I'm going home for the summer and need to store a mini-fridge, two suitcases, and four boxes near Old Campus from May through August. My budget is around $100 per month."

describe("local requirement reading", () => {
  it("moves a named summer that has already ended into the next year", () => {
    expect(interpretDates("May through August", "2026-11-17")).toEqual({
      from: "2027-05-01",
      until: "2027-08-31",
      exact: false,
    })
  })

  it("reads the demo sentence without inventing a neighborhood or a price", () => {
    const requirements = parseLocalRequirements([demo], "2026-11-17")
    expect(requirements.need).toBe("storage")
    expect(requirements.neighborhood).toBe("Old Campus")
    expect(requirements.budgetCents).toBe(10000)
    expect(requirements.from).toBe("2027-05-01")
    expect(requirements.until).toBe("2027-08-31")
    expect(requirements.items.map((item) => item.kind).sort()).toEqual(["boxes", "luggage", "miniFridge"])
    expect(requirements.capacityCuFtMin).toBeGreaterThan(0)
    expect(requirements.datesAreExact).toBe(false)
  })

  it("lets a later budget replace the earlier one and keeps the belongings", () => {
    const requirements = parseLocalRequirements([demo, "Only show options under $80."], "2026-11-17")
    expect(requirements.budgetCents).toBe(8000)
    expect(requirements.neighborhood).toBe("Old Campus")
    expect(requirements.items.map((item) => item.kind)).toContain("miniFridge")
  })

  it("drops a neighborhood and a date the model added when the student never said them", () => {
    const requirements = guardRequirements(
      {
        need: "storage",
        from: "2027-12-01",
        until: "2027-12-20",
        datesAreExact: true,
        items: [
          { label: "piano", quantity: 1 },
          { label: "moving box", quantity: 4 },
        ],
        capacityCuFtMin: 10,
        capacityCuFtMax: 12,
        capacityAssumptions: "Invented.",
        neighborhood: "East Rock",
        budgetCents: 5000,
        budgetPeriod: "month",
        accessNotes: "Daily access",
        vehicleSize: null,
        missing: [],
      },
      ["I need to store four boxes."],
      "2026-11-17",
    )
    expect(requirements.neighborhood).toBeNull()
    expect(requirements.from).toBeNull()
    expect(requirements.budgetCents).toBeNull()
    expect(requirements.items.map((item) => item.kind)).toEqual(["boxes"])
    expect(requirements.accessNotes).toBeNull()
  })
})
