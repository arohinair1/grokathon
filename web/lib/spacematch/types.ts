import type { YaleListing, YaleNeighborhood } from "@/lib/yale/listings"

export type SpaceNeed = "storage" | "parking" | "either"
export type BudgetPeriod = "month" | "day" | "semester" | "total"
export type Fit = "strong" | "possible" | "limited"
export type InferenceMode = "grok" | "local-fallback"

export type PublicListing = {
  id: string
  title: string
  neighborhood: string
  category: YaleListing["category"]
  categoryLabel: string
  spaceType: string
  priceLabel: string
  summary: string
  capacityLabel: string
  availability: string
  availableFrom: string
  availableUntil: string
  image: string
  imageAlt: string
  suitableFor: string[]
  accessNotes: string
  restrictions: string[]
  demo: true
  illustrativePrice: true
}

export type SpaceMatchMatch = {
  listing: PublicListing
  fit: Fit
  explanation: string
  explanationSource: "grok" | "template"
}

export type SpaceMatchMiss = {
  listing: PublicListing
  reasons: string[]
}

export type SpaceMatchResult = {
  inference: InferenceMode
  model: string | null
  fallbackReason: "unconfigured" | "upstream" | "invalid" | "limited" | null
  requirements: SpaceRequirements
  summary: string
  summarySource: "grok" | "template"
  matches: SpaceMatchMatch[]
  misses: SpaceMatchMiss[]
  suggestions: { constraint: string; note: string; count: number }[]
}

export type HostDraft = {
  title: string
  description: string
  category: "storage" | "monthly-parking"
  capacityLabel: string
  capacityCuFtMin: number | null
  capacityCuFtMax: number | null
  suitableFor: string[]
  restrictions: string[]
  neighborhood: YaleNeighborhood | null
  availableFrom: string | null
  availableUntil: string | null
  accessNotes: string
  omitted: string[]
}

export type HostDraftResult = {
  inference: InferenceMode
  model: string | null
  fallbackReason: "unconfigured" | "upstream" | "invalid" | "limited" | null
  draft: HostDraft
}

export type RequestedItem = {
  label: string
  quantity: number | null
  kind: "boxes" | "luggage" | "miniFridge" | "bicycle" | "vehicle" | "other"
}

export type SpaceRequirements = {
  need: SpaceNeed
  from: string | null
  until: string | null
  datesAreExact: boolean
  items: RequestedItem[]
  capacityCuFtMin: number | null
  capacityCuFtMax: number | null
  capacityAssumptions: string
  neighborhood: YaleNeighborhood | null
  budgetCents: number | null
  budgetPeriod: BudgetPeriod | null
  accessNotes: string | null
  vehicleSize: "standard" | "oversized" | null
  missing: string[]
}
