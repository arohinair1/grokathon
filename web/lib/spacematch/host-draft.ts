import { isIsoDate } from "@/lib/catalog"
import { isYaleNeighborhood } from "@/lib/yale/listings"
import { hasDateSignal, neighborhoodsIn } from "@/lib/spacematch/guard"
import { interpretDates } from "@/lib/spacematch/assumptions"
import { grokJson } from "@/lib/spacematch/grok"
import { HOST_DRAFT_SCHEMA } from "@/lib/spacematch/schema"
import type { HostDraft, HostDraftResult } from "@/lib/spacematch/types"

export type { HostDraft, HostDraftResult }

function strings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, limit)
}

function nullableInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5000) return null
  return value
}

export function guardHostDraft(value: unknown, description: string, today: string): HostDraft {
  const raw = value && typeof value === "object" ? value : {}
  const record = raw as Record<string, unknown>
  const parking = /\b(park|parking|driveway|carport|car)\b/i.test(description)
  const storage = /\b(stor|closet|box|boxes|basement|cage)\b/i.test(description)
  const category =
    record.category === "monthly-parking" || record.category === "storage"
      ? record.category
      : parking && !storage
        ? "monthly-parking"
        : "storage"
  const places = neighborhoodsIn(description)
  const proposed =
    typeof record.neighborhood === "string" && isYaleNeighborhood(record.neighborhood) ? record.neighborhood : null
  const neighborhood = places.length === 1 ? places[0] : proposed && places.includes(proposed) ? proposed : null

  let availableFrom: string | null = null
  let availableUntil: string | null = null
  if (hasDateSignal(description)) {
    const interpreted = interpretDates(description, today)
    const from = typeof record.availableFrom === "string" && isIsoDate(record.availableFrom) ? record.availableFrom : null
    const until = typeof record.availableUntil === "string" && isIsoDate(record.availableUntil) ? record.availableUntil : null
    if (from && until) {
      availableFrom = from <= until ? from : until
      availableUntil = from <= until ? until : from
    } else if (interpreted) {
      availableFrom = interpreted.from
      availableUntil = interpreted.until
    }
  }

  const dimensions = description.match(/\b(\d{1,2})\s*(?:by|x|×)\s*(\d{1,2})\b/i)
  const capacityMin = dimensions ? nullableInt(record.capacityCuFtMin) : null
  const capacityMax = dimensions ? nullableInt(record.capacityCuFtMax) : null
  const omitted = [
    ...strings(record.omitted, 6),
    ...(dimensions ? [] : ["No floor dimensions were stated, so none were added."]),
    ...(/\b(camera|alarm|climate|insurance|elevator|outlet)\b/i.test(description)
      ? []
      : ["Security features, insurance, and utilities were not stated, so none were added."]),
  ]

  const titleSource = typeof record.title === "string" ? record.title.trim() : ""
  const descriptionSource = typeof record.description === "string" ? record.description.trim() : ""

  return {
    title: (titleSource || (category === "storage" ? "Storage space near Yale" : "Parking space near Yale")).slice(0, 80),
    description: (descriptionSource || description).slice(0, 800),
    category,
    capacityLabel: dimensions
      ? typeof record.capacityLabel === "string" && record.capacityLabel.trim()
        ? record.capacityLabel.trim().slice(0, 80)
        : `About ${dimensions[1]} by ${dimensions[2]} feet, as stated`
      : "Capacity not stated",
    capacityCuFtMin: capacityMin,
    capacityCuFtMax: capacityMax && capacityMin && capacityMax >= capacityMin ? capacityMax : capacityMin,
    suitableFor: strings(record.suitableFor, 6).filter((item) => {
      const word = item.toLowerCase().match(/[a-z]{4,}/)?.[0]
      return Boolean(word && description.toLowerCase().includes(word))
    }),
    restrictions: strings(record.restrictions, 6),
    neighborhood,
    availableFrom,
    availableUntil,
    accessNotes:
      typeof record.accessNotes === "string" && /\b(weekend|weekday|evening|access|hour|daily)\b/i.test(description)
        ? record.accessNotes.trim().slice(0, 240)
        : "",
    omitted: [...new Set(omitted)].slice(0, 8),
  }
}

export function localHostDraft(description: string, today: string): HostDraft {
  return guardHostDraft({}, description, today)
}

export async function draftListing(description: string, today: string): Promise<HostDraftResult> {
  const generated = await grokJson({
    schemaName: "host_listing_draft",
    schema: HOST_DRAFT_SCHEMA,
    system: `You draft a listing for a student who has permission to rent their own unused storage or parking near Yale.
Today is ${today}.
Use only facts in the host's description. Do not invent dimensions, amenities, security features, insurance, utilities, exact addresses, or permissions.
If they did not state a measurement, leave capacity numbers null and say so in omitted.
Neighborhood must be one of the known New Haven names or null.
The host will review this draft before anything is saved. Nothing is published by this step.`,
    user: description,
  })
  if (!generated.ok) {
    return {
      inference: "local-fallback",
      model: null,
      fallbackReason: generated.reason,
      draft: localHostDraft(description, today),
    }
  }
  return {
    inference: "grok",
    model: generated.model,
    fallbackReason: null,
    draft: guardHostDraft(generated.value, description, today),
  }
}
