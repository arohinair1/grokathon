import { formatPrice, type PriceUnit } from "@/lib/catalog"

/** Inclusive day count. `ends_on - starts_on <= 365` in the database. */
export const MAX_INCLUSIVE_DAYS = 366

export function inclusiveDays(start: string, end: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return null
  const startMs = Date.parse(`${start}T00:00:00Z`)
  const endMs = Date.parse(`${end}T00:00:00Z`)
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null
  return Math.round((endMs - startMs) / 86_400_000) + 1
}

export function todayInAnnArbor(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Detroit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export type PriceGuidance = {
  kind: "estimate" | "confirm"
  text: string
}

/**
 * Day rates can be multiplied by inclusive days and are still an estimate.
 * Month, semester, and event rates are not prorated.
 */
export function priceGuidance(
  cents: number,
  unit: PriceUnit,
  start: string,
  end: string,
): PriceGuidance {
  const listed = formatPrice(cents, unit)
  if (unit === "day") {
    const days = inclusiveDays(start, end)
    if (days == null || days > MAX_INCLUSIVE_DAYS) {
      return {
        kind: "confirm",
        text: `Listed at ${listed}. Choose a start and end to see an estimate. This request does not collect payment.`,
      }
    }
    const totalCents = cents * days
    const total = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: totalCents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(totalCents / 100)
    return {
      kind: "estimate",
      text: `Estimated ${total} for ${days} ${days === 1 ? "day" : "days"} at ${listed}. The host confirms this. This request does not collect payment.`,
    }
  }
  const unitLabel = unit === "month" ? "month" : unit === "semester" ? "semester" : "event"
  return {
    kind: "confirm",
    text: `Listed at ${listed}. A ${unitLabel} rate is not split into days here. The host confirms the amount before anything is agreed. This request does not collect payment.`,
  }
}

export function bookingErrorMessage(token: string): string {
  if (token.includes("booking_conflict") || token.includes("booking_unavailable") || token.includes("accepted_reservation")) {
    return "Those dates are no longer available."
  }
  if (token.includes("booking_invalid_dates")) return "Those dates don’t fit this listing."
  if (token.includes("booking_own_listing")) return "You can’t request your own listing."
  if (token.includes("booking_not_requestable")) return "This listing isn’t open for requests."
  if (token.includes("booking_terminal")) return "That request can no longer be changed."
  if (token.includes("booking_forbidden")) return "You can’t change that request."
  return "The request could not be saved."
}
