import { formatAvailability, formatPrice } from "@/lib/catalog"
import { yaleListings, type YaleListing } from "@/lib/yale/listings"
import { listingCovers } from "@/lib/yale/search"
import type { Fit, SpaceRequirements } from "@/lib/spacematch/types"

export type Exclusion = { id: string; reasons: string[] }

export type RankedMatch = {
  listing: YaleListing
  fit: Fit
  reasons: string[]
}

function itemConflict(listing: YaleListing, requirements: SpaceRequirements): string | null {
  for (const item of requirements.items) {
    if (item.kind === "miniFridge" && !listing.accepts.miniFridge) return "The listing does not accept a mini-fridge."
    if (item.kind === "bicycle" && !listing.accepts.bicycle) return "The listing does not accept a bicycle."
    if (item.kind === "boxes" && !listing.accepts.boxes) return "The listing does not accept boxes."
    if (item.kind === "luggage" && !listing.accepts.luggage) return "The listing does not accept luggage."
    if (item.kind === "vehicle" && !listing.accepts.vehicle) return "The listing is not parking."
  }
  if (requirements.vehicleSize === "oversized" && listing.vehicleLimit === "standard-car") {
    return "The listing is limited to a standard car."
  }
  return null
}

export function exclusionReasons(listing: YaleListing, requirements: SpaceRequirements): string[] {
  const reasons: string[] = []
  if (requirements.need === "storage" && listing.category !== "storage") reasons.push("Different category.")
  if (requirements.need === "parking" && listing.category !== "monthly-parking") reasons.push("Different category.")
  if (requirements.neighborhood && listing.neighborhood !== requirements.neighborhood) {
    reasons.push("Different neighborhood.")
  }
  if (requirements.from && requirements.until && !listingCovers(listing, [requirements.from, requirements.until])) {
    reasons.push("The listed window does not cover the requested dates.")
  }
  if (
    requirements.capacityCuFtMin !== null &&
    listing.capacityCuFtMax !== null &&
    listing.capacityCuFtMax < requirements.capacityCuFtMin
  ) {
    reasons.push("Listed capacity is below the low end of the estimate.")
  }
  if (
    requirements.budgetCents !== null &&
    requirements.budgetPeriod === listing.priceUnit &&
    listing.priceCents > requirements.budgetCents
  ) {
    reasons.push("Illustrative price is above the stated budget.")
  }
  const conflict = itemConflict(listing, requirements)
  if (conflict) reasons.push(conflict)
  return reasons
}

function fitFor(listing: YaleListing, requirements: SpaceRequirements): Fit {
  const capacityTight =
    requirements.capacityCuFtMax !== null &&
    listing.capacityCuFtMax !== null &&
    listing.capacityCuFtMax < requirements.capacityCuFtMax
  const neighborhoodOff = Boolean(requirements.neighborhood && listing.neighborhood !== requirements.neighborhood)
  if (capacityTight || neighborhoodOff) return "limited"
  if (
    requirements.capacityCuFtMax !== null &&
    listing.capacityCuFtMin !== null &&
    listing.capacityCuFtMin >= requirements.capacityCuFtMax
  ) {
    return "strong"
  }
  if (requirements.need === "parking" && listing.category === "monthly-parking") return "strong"
  return "possible"
}

export function matchListings(requirements: SpaceRequirements, source: YaleListing[] = yaleListings): {
  matches: RankedMatch[]
  excluded: Exclusion[]
} {
  const matches: RankedMatch[] = []
  const excluded: Exclusion[] = []
  for (const listing of source) {
    const reasons = exclusionReasons(listing, requirements)
    if (reasons.length > 0) {
      excluded.push({ id: listing.id, reasons })
      continue
    }
    matches.push({ listing, fit: fitFor(listing, requirements), reasons: [] })
  }
  matches.sort((a, b) => {
    const rank = { strong: 0, possible: 1, limited: 2 }
    if (rank[a.fit] !== rank[b.fit]) return rank[a.fit] - rank[b.fit]
    return a.listing.priceCents - b.listing.priceCents
  })
  return { matches, excluded }
}

export type Relaxation = { constraint: string; note: string; count: number }

export function relaxations(requirements: SpaceRequirements, source: YaleListing[] = yaleListings): Relaxation[] {
  const current = matchListings(requirements, source).matches.length
  if (current > 0) return []
  const ideas: { constraint: string; next: SpaceRequirements; note: (count: number) => string }[] = []
  if (requirements.neighborhood) {
    ideas.push({
      constraint: "neighborhood",
      next: { ...requirements, neighborhood: null },
      note: (count) => `Leaving the neighborhood open would show ${count} sample listing${count === 1 ? "" : "s"}.`,
    })
  }
  if (requirements.budgetCents) {
    ideas.push({
      constraint: "budget",
      next: { ...requirements, budgetCents: null, budgetPeriod: null },
      note: (count) => `Dropping the budget cap would show ${count} sample listing${count === 1 ? "" : "s"}.`,
    })
  }
  if (requirements.capacityCuFtMin) {
    ideas.push({
      constraint: "capacity",
      next: { ...requirements, capacityCuFtMin: null, capacityCuFtMax: null },
      note: (count) => `Ignoring the capacity estimate would show ${count} sample listing${count === 1 ? "" : "s"}.`,
    })
  }
  if (requirements.from || requirements.until) {
    ideas.push({
      constraint: "dates",
      next: { ...requirements, from: null, until: null },
      note: (count) => `Clearing the dates would show ${count} sample listing${count === 1 ? "" : "s"}.`,
    })
  }
  return ideas.flatMap((idea) => {
    const count = matchListings(idea.next, source).matches.length
    if (count === 0) return []
    return [{ constraint: idea.constraint, note: idea.note(count), count }]
  })
}

export function templateExplanation(listing: YaleListing, requirements: SpaceRequirements, fit: Fit): string {
  const sentences: string[] = []
  const place = `${listing.neighborhood}`
  if (listing.category === "storage") {
    sentences.push(
      `${fit === "strong" ? "A strong sample fit" : fit === "possible" ? "A possible sample fit" : "A tighter sample fit"} for storage in ${place}.`,
    )
    if (listing.capacityCuFtMin !== null && listing.capacityCuFtMax !== null) {
      sentences.push(
        `The listing estimates ${listing.capacityCuFtMin}–${listing.capacityCuFtMax} cubic feet (${listing.capacityLabel}).`,
      )
    }
    if (requirements.items.length > 0) {
      sentences.push(`It says it can take ${listing.suitableFor.join(", ")}.`)
    }
  } else {
    sentences.push(`A sample parking spot in ${place} for ${listing.capacityLabel.toLowerCase()}.`)
  }
  if (requirements.neighborhood && requirements.neighborhood !== listing.neighborhood) {
    sentences.push(`You asked about ${requirements.neighborhood}. This sample is in ${listing.neighborhood} instead.`)
  } else if (requirements.neighborhood) {
    sentences.push(`The neighborhood matches ${requirements.neighborhood}.`)
  }
  if (requirements.from && requirements.until) {
    sentences.push(
      `The sample window ${formatAvailability(listing)} covers ${requirements.from} through ${requirements.until}.`,
    )
  } else {
    sentences.push(`Listed availability is ${formatAvailability(listing)}.`)
  }
  sentences.push(`The illustrative price is ${formatPrice(listing.priceCents, listing.priceUnit)}.`)
  if (listing.restrictions.length > 0) sentences.push(`Listed limits: ${listing.restrictions.join(" ")}`)
  sentences.push(`Access: ${listing.accessNotes}`)
  return sentences.join(" ")
}

export function orderMatches(matches: RankedMatch[], ranking: { id: string; fit?: Fit; explanation?: string }[]): RankedMatch[] {
  const byId = new Map(matches.map((match) => [match.listing.id, match]))
  const ordered: RankedMatch[] = []
  const seen = new Set<string>()
  for (const entry of ranking) {
    const match = byId.get(entry.id)
    if (!match || seen.has(entry.id)) continue
    seen.add(entry.id)
    ordered.push({
      ...match,
      fit: entry.fit ?? match.fit,
    })
  }
  for (const match of matches) {
    if (!seen.has(match.listing.id)) ordered.push(match)
  }
  return ordered
}
