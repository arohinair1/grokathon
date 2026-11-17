import { isIsoDate } from "@/lib/catalog"

export type SampleRequest = {
  id: string
  listingId: string
  listingTitle: string
  from: string
  until: string
  status: "pending" | "accepted" | "declined"
  createdAt: string
}

export function validateSampleDates(
  availableFrom: string,
  availableUntil: string,
  from: string,
  until: string,
): string | null {
  if (!isIsoDate(from) || !isIsoDate(until)) return "Choose both dates."
  const start = from <= until ? from : until
  const end = from <= until ? until : from
  if (start < availableFrom || end > availableUntil) {
    return "Those dates sit outside the sample listing’s window."
  }
  return null
}

export function createSampleRequest(input: {
  listingId: string
  listingTitle: string
  from: string
  until: string
  now?: string
}): SampleRequest {
  const start = input.from <= input.until ? input.from : input.until
  const end = input.from <= input.until ? input.until : input.from
  return {
    id: `sample-${input.listingId}-${start}`,
    listingId: input.listingId,
    listingTitle: input.listingTitle,
    from: start,
    until: end,
    status: "pending",
    createdAt: input.now ?? new Date().toISOString(),
  }
}
