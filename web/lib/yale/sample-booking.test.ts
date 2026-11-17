import { describe, expect, it } from "vitest"
import { createSampleRequest, validateSampleDates } from "@/lib/yale/sample-booking"

describe("simulated requests", () => {
  it("rejects dates outside the sample window", () => {
    expect(validateSampleDates("2027-05-01", "2027-08-31", "2027-04-01", "2027-06-01")).toMatch(/outside/)
    expect(validateSampleDates("2027-05-01", "2027-08-31", "2027-06-01", "2027-07-01")).toBeNull()
  })

  it("builds a pending browser request and does not invent a payment", () => {
    const request = createSampleRequest({
      listingId: "old-campus-summer-storage",
      listingTitle: "Summer storage near Old Campus",
      from: "2027-07-02",
      until: "2027-06-01",
      now: "2026-11-17T22:00:00.000Z",
    })
    expect(request.status).toBe("pending")
    expect(request.from).toBe("2027-06-01")
    expect(request.until).toBe("2027-07-02")
    expect(JSON.stringify(request)).not.toContain("payment")
  })
})
