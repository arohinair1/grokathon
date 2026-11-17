import { isIsoDate } from "@/lib/catalog"
import { isYaleNeighborhood, type YaleNeighborhood } from "@/lib/yale/listings"
import { interpretDates } from "@/lib/spacematch/assumptions"
import type { BudgetPeriod, RequestedItem, SpaceNeed, SpaceRequirements } from "@/lib/spacematch/types"

const NEIGHBORHOOD_ALIASES: { name: YaleNeighborhood; pattern: RegExp }[] = [
  { name: "Old Campus", pattern: /\bold campus\b/i },
  { name: "Broadway", pattern: /\bbroadway\b/i },
  { name: "Science Hill", pattern: /\bscience hill\b/i },
  { name: "Dwight", pattern: /\bdwight\b/i },
  { name: "East Rock", pattern: /\beast rock\b/i },
  { name: "Downtown New Haven", pattern: /\bdowntown\b/i },
]

export function neighborhoodsIn(text: string): YaleNeighborhood[] {
  return NEIGHBORHOOD_ALIASES.filter((entry) => entry.pattern.test(text)).map((entry) => entry.name)
}

export function hasDateSignal(text: string): boolean {
  return (
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|20\d{2}|\d{1,2}\/\d{1,2})\b/i.test(
      text,
    )
  )
}

export function dollarsIn(text: string): number[] {
  const found = new Set<number>()
  for (const match of text.matchAll(/\$\s*(\d{1,5})(?:\.\d{1,2})?/g)) found.add(Number(match[1]))
  for (const match of text.matchAll(/\b(\d{1,5})\s*(?:dollars|bucks)\b/gi)) found.add(Number(match[1]))
  for (const match of text.matchAll(/\b(?:budget|under|around|about|below|over|less than|up to)\s*\$?\s*(\d{1,5})\b/gi)) {
    found.add(Number(match[1]))
  }
  return [...found]
}

const KIND_PATTERNS: { kind: RequestedItem["kind"]; pattern: RegExp }[] = [
  { kind: "miniFridge", pattern: /\bmini[-\s]?fridge\b|\bmini refrigerator\b|\bfridge\b/i },
  { kind: "bicycle", pattern: /\b(?:bike|bicycle|bikes|bicycles)\b/i },
  { kind: "luggage", pattern: /\b(?:suitcase|suitcases|luggage|duffel|trunk)\b/i },
  { kind: "boxes", pattern: /\b(?:box|boxes)\b/i },
  { kind: "vehicle", pattern: /\b(?:car|vehicle|suv|van|truck|parking)\b/i },
]

export function itemKind(label: string): RequestedItem["kind"] {
  for (const entry of KIND_PATTERNS) {
    if (entry.pattern.test(label)) return entry.kind
  }
  return "other"
}

export function kindMentioned(kind: RequestedItem["kind"], text: string): boolean {
  if (kind === "other") return false
  const entry = KIND_PATTERNS.find((item) => item.kind === kind)
  return entry ? entry.pattern.test(text) : false
}

function clampQuantity(value: number | null): number | null {
  if (value === null) return null
  if (!Number.isInteger(value) || value < 1 || value > 40) return null
  return value
}

function cleanNeed(value: string): SpaceNeed {
  if (value === "storage" || value === "parking" || value === "either") return value
  return "either"
}

function cleanPeriod(value: string | null): BudgetPeriod | null {
  if (value === "month" || value === "day" || value === "semester" || value === "total") return value
  return null
}

export function emptyRequirements(): SpaceRequirements {
  return {
    need: "either",
    from: null,
    until: null,
    datesAreExact: false,
    items: [],
    capacityCuFtMin: null,
    capacityCuFtMax: null,
    capacityAssumptions: "",
    neighborhood: null,
    budgetCents: null,
    budgetPeriod: null,
    accessNotes: null,
    vehicleSize: null,
    missing: [],
  }
}

export type RawRequirements = {
  need?: unknown
  from?: unknown
  until?: unknown
  datesAreExact?: unknown
  items?: unknown
  capacityCuFtMin?: unknown
  capacityCuFtMax?: unknown
  capacityAssumptions?: unknown
  neighborhood?: unknown
  budgetCents?: unknown
  budgetPeriod?: unknown
  accessNotes?: unknown
  vehicleSize?: unknown
  missing?: unknown
}

function asInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null
  return value
}

/** Drop anything the user did not say. Capacity estimates are allowed. */
export function guardRequirements(
  raw: RawRequirements,
  messages: string[],
  today: string,
): SpaceRequirements {
  const transcript = messages.join("\n")
  const latest = messages[messages.length - 1] ?? ""
  const earlier = messages.slice(0, -1).join("\n")
  const requirements = emptyRequirements()

  const statedNeed = typeof raw.need === "string" ? cleanNeed(raw.need) : "either"
  const latestParking = /\b(?:park|parking|car|driveway|vehicle)\b/i.test(latest)
  const latestStorage = /\b(?:stor(?:e|age|ing)|box|boxes|suitcase|closet|fridge|bike|bicycle)\b/i.test(latest)
  if (latestParking && !latestStorage) requirements.need = "parking"
  else if (latestStorage && !latestParking) requirements.need = "storage"
  else if (latestParking && latestStorage) requirements.need = statedNeed
  else requirements.need = statedNeed

  const latestNeighborhoods = neighborhoodsIn(latest)
  const earlierNeighborhoods = neighborhoodsIn(earlier)
  const proposedNeighborhood =
    typeof raw.neighborhood === "string" && isYaleNeighborhood(raw.neighborhood) ? raw.neighborhood : null
  if (latestNeighborhoods.length === 1) requirements.neighborhood = latestNeighborhoods[0]
  else if (latestNeighborhoods.length > 1 && proposedNeighborhood && latestNeighborhoods.includes(proposedNeighborhood)) {
    requirements.neighborhood = proposedNeighborhood
  } else if (latestNeighborhoods.length === 0) {
    if (proposedNeighborhood && earlierNeighborhoods.includes(proposedNeighborhood)) {
      requirements.neighborhood = proposedNeighborhood
    } else if (earlierNeighborhoods.length === 1) requirements.neighborhood = earlierNeighborhoods[0]
  }

  const dollars = dollarsIn(latest)
  const earlierDollars = dollarsIn(earlier)
  const proposedDollars = asInt(raw.budgetCents)
  const proposedAmount = proposedDollars === null ? null : Math.round(proposedDollars / 100)
  const allowed = dollars.length > 0 ? dollars : earlierDollars
  if (proposedAmount !== null && allowed.includes(proposedAmount) && proposedAmount > 0 && proposedAmount <= 5000) {
    requirements.budgetCents = proposedAmount * 100
    requirements.budgetPeriod = cleanPeriod(typeof raw.budgetPeriod === "string" ? raw.budgetPeriod : null) ?? "month"
  } else if (dollars.length === 1) {
    requirements.budgetCents = dollars[0] * 100
    requirements.budgetPeriod = /\bday\b/i.test(latest) ? "day" : "month"
  } else if (dollars.length === 0 && earlierDollars.length === 1 && !/\b(any budget|no budget|budget does not matter)\b/i.test(latest)) {
    requirements.budgetCents = earlierDollars[0] * 100
    requirements.budgetPeriod = "month"
  }

  const dateSource = hasDateSignal(latest) ? latest : hasDateSignal(earlier) ? earlier : ""
    if (dateSource) {
      const interpreted = interpretDates(dateSource, today)
      const proposedFrom = typeof raw.from === "string" && isIsoDate(raw.from) ? raw.from : null
      const proposedUntil = typeof raw.until === "string" && isIsoDate(raw.until) ? raw.until : null
      const namedMonths = new Set(
        [...dateSource.toLowerCase().matchAll(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/g)].map(
          (match) =>
            ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(
              match[1],
            ) + 1,
        ),
      )
      const monthIsNamed = (iso: string) => namedMonths.size === 0 || namedMonths.has(Number(iso.slice(5, 7))) || dateSource.includes(iso)
      if (proposedFrom && proposedUntil && monthIsNamed(proposedFrom) && monthIsNamed(proposedUntil)) {
        const [from, until] = proposedFrom <= proposedUntil ? [proposedFrom, proposedUntil] : [proposedUntil, proposedFrom]
        const yearOk = [from, until].every((iso) => {
          const year = Number(iso.slice(0, 4))
          const todayYear = Number(today.slice(0, 4))
          return year === todayYear || year === todayYear + 1
        })
        if (yearOk) {
          requirements.from = from
          requirements.until = until
          requirements.datesAreExact = raw.datesAreExact === true && interpreted?.exact === true
        }
      }
    if (!requirements.from && interpreted) {
      requirements.from = interpreted.from
      requirements.until = interpreted.until
      requirements.datesAreExact = interpreted.exact
    }
  }

  const sourceItems = Array.isArray(raw.items) ? raw.items : []
  const kept = new Map<RequestedItem["kind"], RequestedItem>()
  for (const item of sourceItems) {
    if (!item || typeof item !== "object") continue
    const label = "label" in item && typeof item.label === "string" ? item.label.trim().slice(0, 80) : ""
    if (!label) continue
    const kind = itemKind(label)
    if (!kindMentioned(kind, transcript)) continue
    const quantity = clampQuantity(asInt("quantity" in item ? item.quantity : null))
    const existing = kept.get(kind)
    kept.set(kind, {
      label: existing?.label ?? label,
      quantity: quantity ?? existing?.quantity ?? null,
      kind,
    })
  }
  requirements.items = [...kept.values()]

  if (/\b(suv|van|truck)\b/i.test(transcript)) requirements.vehicleSize = "oversized"
  else if (kindMentioned("vehicle", transcript) && requirements.need !== "storage") requirements.vehicleSize = "standard"
  else requirements.vehicleSize = null

  const proposedMin = asInt(raw.capacityCuFtMin)
  const proposedMax = asInt(raw.capacityCuFtMax)
  if (
    proposedMin !== null &&
    proposedMax !== null &&
    proposedMin > 0 &&
    proposedMax >= proposedMin &&
    proposedMax <= 2000 &&
    requirements.items.length > 0
  ) {
    requirements.capacityCuFtMin = proposedMin
    requirements.capacityCuFtMax = proposedMax
    requirements.capacityAssumptions =
      typeof raw.capacityAssumptions === "string" && raw.capacityAssumptions.trim()
        ? raw.capacityAssumptions.trim().slice(0, 500)
        : "Grok estimated this range. Exact dimensions were not provided."
  }

  const access =
    typeof raw.accessNotes === "string" && /\b(weekend|weekday|evening|access|daily|hour)\b/i.test(transcript)
      ? raw.accessNotes.trim().slice(0, 240)
      : null
  requirements.accessNotes = access

  const missing = Array.isArray(raw.missing)
    ? raw.missing.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.slice(0, 140)).slice(0, 6)
    : []
  if (!requirements.from) missing.push("Dates were not confirmed.")
  if (requirements.need === "storage" && requirements.items.length === 0) missing.push("No specific belongings were confirmed.")
  if (!requirements.budgetCents) missing.push("No budget was confirmed.")
  requirements.missing = [...new Set(missing)]
  return requirements
}
