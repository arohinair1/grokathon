import { formatAvailability, formatPrice } from "@/lib/catalog"
import { getYaleListing, yaleCategoryLabel, type YaleListing } from "@/lib/yale/listings"
import { estimateCapacity, yaleToday } from "@/lib/spacematch/assumptions"
import { grokJson, grokModel } from "@/lib/spacematch/grok"
import { guardRequirements, type RawRequirements } from "@/lib/spacematch/guard"
import { parseLocalRequirements } from "@/lib/spacematch/local-parse"
import { matchListings, orderMatches, relaxations, templateExplanation, type RankedMatch } from "@/lib/spacematch/match"
import { RANKING_SCHEMA, REQUIREMENTS_SCHEMA, readRanking } from "@/lib/spacematch/schema"
import type {
  Fit,
  InferenceMode,
  PublicListing,
  SpaceMatchMatch,
  SpaceMatchMiss,
  SpaceMatchResult,
  SpaceRequirements,
} from "@/lib/spacematch/types"

export type { SpaceMatchResult }

const SYSTEM = `You extract a Yale student's storage or parking request for College Space.
Today is TODAY in America/New_York.
Return JSON only.
Do not invent listings, street addresses, prices, amenities, or dates the student did not state.
If they name a month without a year, use the next occurrence that has not already ended before today.
datesAreExact is true only when they gave a calendar day or an ISO date.
neighborhood is only one of Old Campus, Broadway, Science Hill, Dwight, East Rock, Downtown New Haven, or null. "Downtown" means Downtown New Haven.
budgetCents is integer US cents. A stated "$100 per month" is 10000 and budgetPeriod "month". "$100 total", or a weekend stay that does not name a monthly price, is budgetPeriod "total". If they did not state a budget, use null.
"for the summer" without month names is May 1 through August 31, using the next summer that has not already ended. "a weekend" without a calendar date is the next Saturday and Sunday on or after today. Do not pick a different weekend.
Estimate capacityCuFtMin and capacityCuFtMax only for belongings they named. Use about 2–4 cubic feet per moving box, 3–6 per suitcase, 10–18 for a mini-fridge including clearance, and 10–20 for a bicycle. Say that these are estimates, not measurements. If they named no belongings, both capacity fields are null.
The latest message overrides an earlier budget, neighborhood, date, or belonging list when it conflicts. Keep earlier details the latest message does not change. "Too" or "also" adds a belonging.
vehicleSize is "oversized" for an SUV, van, or truck, "standard" for an ordinary car, otherwise null.
missing lists what is still ambiguous. Do not present a guess as a confirmed fact.`

function extractionSystem(today: string): string {
  return SYSTEM.replace("TODAY", today)
}

function toPublic(listing: YaleListing): PublicListing {
  return {
    id: listing.id,
    title: listing.title,
    neighborhood: listing.neighborhood,
    category: listing.category,
    categoryLabel: yaleCategoryLabel(listing.category),
    spaceType: listing.spaceType,
    priceLabel: formatPrice(listing.priceCents, listing.priceUnit),
    summary: listing.summary,
    capacityLabel: listing.capacityLabel,
    availability: formatAvailability(listing),
    availableFrom: listing.availableFrom,
    availableUntil: listing.availableUntil,
    image: listing.image,
    imageAlt: listing.imageAlt,
    suitableFor: listing.suitableFor,
    accessNotes: listing.accessNotes,
    restrictions: listing.restrictions,
    demo: true,
    illustrativePrice: true,
  }
}

function listingFacts(listing: YaleListing) {
  return {
    id: listing.id,
    title: listing.title,
    neighborhood: listing.neighborhood,
    category: yaleCategoryLabel(listing.category),
    spaceType: listing.spaceType,
    capacityLabel: listing.capacityLabel,
    capacityCuFtMin: listing.capacityCuFtMin,
    capacityCuFtMax: listing.capacityCuFtMax,
    suitableFor: listing.suitableFor,
    restrictions: listing.restrictions,
    accessNotes: listing.accessNotes,
    availableFrom: listing.availableFrom,
    availableUntil: listing.availableUntil,
    illustrativePrice: formatPrice(listing.priceCents, listing.priceUnit),
  }
}

function grounded(explanation: string, listing: YaleListing, requirements: SpaceRequirements): boolean {
  const text = explanation.toLowerCase()
  const allowedPlaces = new Set([listing.neighborhood.toLowerCase(), requirements.neighborhood?.toLowerCase() ?? ""])
  for (const place of ["old campus", "broadway", "science hill", "dwight", "east rock", "downtown new haven", "ann arbor", "michigan"]) {
    if (text.includes(place) && !allowedPlaces.has(place)) return false
  }
  const price = `$${Math.round(listing.priceCents / 100)}`
  const amounts = explanation.match(/\$\d+/g) ?? []
  if (amounts.some((amount) => amount !== price)) return false
  return explanation.length > 0 && explanation.length <= 500
}

function applyOverride(requirements: SpaceRequirements, override: number | null): SpaceRequirements {
  if (!override || override < 1 || override > 2000) return requirements
  return {
    ...requirements,
    capacityCuFtMin: override,
    capacityCuFtMax: override,
    capacityAssumptions: `You set the working estimate to ${override} cubic feet. ${requirements.capacityAssumptions}`.trim(),
  }
}

function fillCapacity(requirements: SpaceRequirements): SpaceRequirements {
  if (requirements.capacityCuFtMin !== null || requirements.need === "parking" || requirements.items.length === 0) {
    return requirements
  }
  const estimate = estimateCapacity(requirements.items)
  return {
    ...requirements,
    capacityCuFtMin: estimate.min,
    capacityCuFtMax: estimate.max,
    capacityAssumptions: requirements.capacityAssumptions || estimate.assumptions,
  }
}

export async function runSpaceMatch(input: {
  messages: string[]
  capacityOverrideCuFt: number | null
  today?: string
}): Promise<SpaceMatchResult> {
  const today = input.today ?? yaleToday()
  const transcript = input.messages.map((message, index) => `Message ${index + 1}: ${message}`).join("\n")
  const generated = await grokJson({
    schemaName: "space_requirements",
    schema: REQUIREMENTS_SCHEMA,
    system: extractionSystem(today),
    user: transcript,
  })

  let inference: InferenceMode = "local-fallback"
  let model: string | null = null
  let fallbackReason: SpaceMatchResult["fallbackReason"] = "unconfigured"
  let requirements: SpaceRequirements

  if (generated.ok && generated.value && typeof generated.value === "object") {
    requirements = guardRequirements(generated.value as RawRequirements, input.messages, today)
    inference = "grok"
    model = generated.model
    fallbackReason = null
  } else {
    requirements = parseLocalRequirements(input.messages, today)
    fallbackReason = generated.ok ? "invalid" : generated.reason
    if (fallbackReason !== "unconfigured") inference = "local-fallback"
  }

  requirements = fillCapacity(applyOverride(requirements, input.capacityOverrideCuFt))
  const matched = matchListings(requirements)
  let ordered = matched.matches
  let summary = summaryFor(requirements, matched.matches.length)
  let summarySource: "grok" | "template" = "template"
  const explanations = new Map<string, { text: string; source: "grok" | "template"; fit?: Fit }>()

  if (inference === "grok" && matched.matches.length > 0) {
    const ranked = await grokJson({
      schemaName: "listing_rankings",
      schema: RANKING_SCHEMA,
      system:
        "You explain sample listings that College Space already selected. Use only the JSON facts. Do not add listings, addresses, amenities, availability, or prices. Each explanation is at most two sentences and must mention a real limitation from those facts. Prices are illustrative samples. Rank the given ids only.",
      user: JSON.stringify({
        requirements: {
          need: requirements.need,
          from: requirements.from,
          until: requirements.until,
          datesAreExact: requirements.datesAreExact,
          items: requirements.items,
          capacityCuFtMin: requirements.capacityCuFtMin,
          capacityCuFtMax: requirements.capacityCuFtMax,
          neighborhood: requirements.neighborhood,
          budgetCents: requirements.budgetCents,
          accessNotes: requirements.accessNotes,
        },
        listings: matched.matches.map((match) => listingFacts(match.listing)),
      }),
    })
    const parsed = ranked.ok ? readRanking(ranked.value) : null
    if (parsed) {
      ordered = orderMatches(matched.matches, parsed.rankings)
      summary = parsed.summary
      summarySource = "grok"
      for (const entry of parsed.rankings) {
        const match = ordered.find((item) => item.listing.id === entry.id)
        if (!match) continue
        if (!grounded(entry.explanation, match.listing, requirements)) continue
        explanations.set(entry.id, { text: entry.explanation, source: "grok", fit: entry.fit })
      }
    }
  }

  const matches: SpaceMatchMatch[] = ordered.map((match) => {
    const generatedExplanation = explanations.get(match.listing.id)
    const fit = generatedExplanation?.fit ?? match.fit
    return {
      listing: toPublic(match.listing),
      fit,
      explanation: generatedExplanation?.text ?? templateExplanation(match.listing, requirements, fit),
      explanationSource: generatedExplanation?.source ?? "template",
    }
  })

  const misses: SpaceMatchMiss[] =
    matches.length > 0
      ? []
      : matched.excluded
          .map((entry) => {
            const listing = getYaleListing(entry.id)
            return listing ? { listing: toPublic(listing), reasons: entry.reasons } : null
          })
          .filter((entry): entry is SpaceMatchMiss => entry !== null)
          .sort((a, b) => a.reasons.length - b.reasons.length)
          .slice(0, 3)

  return {
    inference,
    model: inference === "grok" ? model ?? grokModel() : null,
    fallbackReason,
    requirements,
    summary,
    summarySource,
    matches,
    misses,
    suggestions: relaxations(requirements),
  }
}

function summaryFor(requirements: SpaceRequirements, count: number): string {
  if (count === 0) {
    return "No sample listing fits every confirmed constraint. The notes below say which constraint would open more of the demo catalog."
  }
  const need = requirements.need === "parking" ? "parking" : requirements.need === "storage" ? "storage" : "space"
  return `${count} sample ${need} listing${count === 1 ? "" : "s"} fit the constraints College Space could confirm.`
}

export function visibleMatchIds(matches: RankedMatch[]): string[] {
  return matches.map((match) => match.listing.id)
}
