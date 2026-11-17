import { describe, expect, it } from "vitest"
import {
  bookingErrorMessage,
  inclusiveDays,
  priceGuidance,
  todayInAnnArbor,
} from "@/lib/bookings/pricing"

describe("inclusiveDays", () => {
  it("counts both ends and rejects a reversed range", () => {
    expect(inclusiveDays("2027-06-01", "2027-06-01")).toBe(1)
    expect(inclusiveDays("2027-06-01", "2027-06-05")).toBe(5)
    expect(inclusiveDays("2027-06-05", "2027-06-01")).toBeNull()
    expect(inclusiveDays("June 1", "2027-06-05")).toBeNull()
  })
})

describe("todayInAnnArbor", () => {
  it("uses the Detroit calendar date around midnight UTC", () => {
    expect(todayInAnnArbor(new Date("2026-10-18T03:30:00.000Z"))).toBe("2026-10-17")
    expect(todayInAnnArbor(new Date("2026-10-18T16:00:00.000Z"))).toBe("2026-10-18")
  })
})

describe("priceGuidance", () => {
  it("estimates a day rate and does not prorate a month", () => {
    expect(priceGuidance(4000, "day", "2027-06-01", "2027-06-03").text).toContain("Estimated $120")
    expect(priceGuidance(4000, "day", "2027-06-01", "2027-06-03").text).toContain("does not collect payment")
    expect(priceGuidance(1250, "day", "2027-06-01", "2027-06-03").text).toContain("Estimated $37.50")
    expect(priceGuidance(1250, "day", "2027-06-01", "2027-06-03").text).toContain("$12.50 / day")
    const month = priceGuidance(14500, "month", "2027-06-01", "2027-06-20")
    expect(month.kind).toBe("confirm")
    expect(month.text).toContain("$145 / month")
    expect(month.text).not.toContain("Estimated")
    expect(priceGuidance(5500, "event", "2027-06-01", "2027-06-01").text).toContain("not split into days")
  })
})

describe("bookingErrorMessage", () => {
  it("maps database tokens to renter-facing sentences", () => {
    expect(bookingErrorMessage("booking_own_listing")).toMatch(/own listing/)
    expect(bookingErrorMessage("booking_conflict")).toMatch(/no longer available/)
    expect(bookingErrorMessage("accepted_reservation")).toMatch(/no longer available/)
    expect(bookingErrorMessage("something else")).toMatch(/could not be saved/)
  })
})
