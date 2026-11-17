import { estimateCapacity, interpretDates } from "@/lib/spacematch/assumptions"
import {
  dollarsIn,
  emptyRequirements,
  hasDateSignal,
  itemKind,
  kindMentioned,
  neighborhoodsIn,
} from "@/lib/spacematch/guard"
import type { RequestedItem, SpaceRequirements } from "@/lib/spacematch/types"

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

function quantityBefore(text: string, pattern: RegExp): number | null {
  const match = text.match(new RegExp(`(?:(\\d{1,2})|(${Object.keys(NUMBER_WORDS).join("|")}))\\s+(?:[a-z]+\\s+){0,2}(?:${pattern.source})`, "i"))
  if (!match) return null
  if (match[1]) return Number(match[1])
  return NUMBER_WORDS[match[2].toLowerCase()] ?? null
}

function itemsFrom(text: string): RequestedItem[] {
  const specs: { kind: RequestedItem["kind"]; label: string; pattern: RegExp }[] = [
    { kind: "miniFridge", label: "mini-fridge", pattern: /mini[-\s]?fridge|fridge/ },
    { kind: "luggage", label: "suitcase", pattern: /suitcases?|luggage/ },
    { kind: "boxes", label: "moving box", pattern: /boxes|box/ },
    { kind: "bicycle", label: "bicycle", pattern: /bicycles?|bikes?/ },
    { kind: "vehicle", label: "car", pattern: /cars?|vehicles?|suv|van|truck/ },
  ]
  return specs.flatMap((spec) => {
    if (!kindMentioned(spec.kind, text)) return []
    return [{ label: spec.label, quantity: quantityBefore(text, spec.pattern), kind: spec.kind }]
  })
}

function mergeItems(base: RequestedItem[], extra: RequestedItem[]): RequestedItem[] {
  const map = new Map(base.map((item) => [item.kind, item]))
  for (const item of extra) map.set(item.kind, item)
  return [...map.values()]
}

export function parseLocalRequirements(messages: string[], today: string): SpaceRequirements {
  const requirements = emptyRequirements()
  const latest = messages[messages.length - 1] ?? ""
  const earlier = messages.slice(0, -1).join("\n")
  const transcript = messages.join("\n")
  const additive = /\b(too|also|as well|another|plus)\b/i.test(latest)

  const latestParking = /\b(?:park|parking|driveway|carport)\b/i.test(latest)
  const latestStorage = /\b(?:stor(?:e|age|ing)|box|boxes|suitcase|closet|fridge|bike|bicycle)\b/i.test(latest)
  const earlierParking = /\b(?:park|parking|driveway|carport)\b/i.test(earlier)
  const earlierStorage = /\b(?:stor(?:e|age|ing)|box|boxes|suitcase|closet|fridge|bike|bicycle)\b/i.test(earlier)
  if (latestParking && !latestStorage) requirements.need = "parking"
  else if (latestStorage && !latestParking) requirements.need = "storage"
  else if (earlierParking && !earlierStorage) requirements.need = "parking"
  else if (earlierStorage && !earlierParking) requirements.need = "storage"
  else requirements.need = "either"

  const latestNeighborhoods = neighborhoodsIn(latest)
  const earlierNeighborhoods = neighborhoodsIn(earlier)
  requirements.neighborhood = latestNeighborhoods[0] ?? (latestNeighborhoods.length === 0 ? earlierNeighborhoods[0] ?? null : null)

  const latestDollars = dollarsIn(latest)
  const earlierDollars = dollarsIn(earlier)
  const amount = latestDollars[0] ?? earlierDollars[0] ?? null
  if (amount) {
    requirements.budgetCents = amount * 100
    requirements.budgetPeriod = /\b(a day|per day|\/day)\b/i.test(latest + earlier) ? "day" : "month"
  }

  const dateText = hasDateSignal(latest) ? latest : hasDateSignal(earlier) ? earlier : ""
  const dates = dateText ? interpretDates(dateText, today) : null
  if (dates) {
    requirements.from = dates.from
    requirements.until = dates.until
    requirements.datesAreExact = dates.exact
  }

  const latestItems = itemsFrom(latest)
  const earlierItems = itemsFrom(earlier)
  requirements.items = additive ? mergeItems(earlierItems, latestItems) : latestItems.length > 0 ? latestItems : earlierItems
  if (requirements.need === "parking") {
    requirements.items = requirements.items.filter((item) => item.kind === "vehicle" || itemKind(item.label) === "vehicle")
  }

  if (/\b(suv|van|truck)\b/i.test(transcript)) requirements.vehicleSize = "oversized"
  else if (requirements.need === "parking") requirements.vehicleSize = "standard"

  if (requirements.need !== "parking") {
    const estimate = estimateCapacity(requirements.items)
    requirements.capacityCuFtMin = estimate.min
    requirements.capacityCuFtMax = estimate.max
    requirements.capacityAssumptions = estimate.assumptions
  }

  if (/\bweekend/.test(transcript.toLowerCase())) requirements.accessNotes = "Weekend access mentioned."
  else if (/\bevening/.test(transcript.toLowerCase())) requirements.accessNotes = "Evening access mentioned."

  if (!requirements.from) requirements.missing.push("Dates were not confirmed.")
  if (requirements.need === "storage" && requirements.items.length === 0) requirements.missing.push("No specific belongings were confirmed.")
  if (!requirements.budgetCents) requirements.missing.push("No budget was confirmed.")
  return requirements
}
