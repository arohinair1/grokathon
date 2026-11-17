import { YALE_NEIGHBORHOODS } from "@/lib/yale/listings"

const neighborhoodSchema = {
  anyOf: [{ type: "string", enum: [...YALE_NEIGHBORHOODS] }, { type: "null" }],
}

const nullableDate = {
  anyOf: [{ type: "string", format: "date" }, { type: "null" }],
}

const nullableInt = {
  anyOf: [{ type: "integer" }, { type: "null" }],
}

export const REQUIREMENTS_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "need",
    "from",
    "until",
    "datesAreExact",
    "items",
    "capacityCuFtMin",
    "capacityCuFtMax",
    "capacityAssumptions",
    "neighborhood",
    "budgetCents",
    "budgetPeriod",
    "accessNotes",
    "vehicleSize",
    "missing",
  ],
  properties: {
    need: { type: "string", enum: ["storage", "parking", "either"] },
    from: nullableDate,
    until: nullableDate,
    datesAreExact: { type: "boolean" },
    items: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "quantity"],
        properties: {
          label: { type: "string" },
          quantity: nullableInt,
        },
      },
    },
    capacityCuFtMin: nullableInt,
    capacityCuFtMax: nullableInt,
    capacityAssumptions: { type: "string" },
    neighborhood: neighborhoodSchema,
    budgetCents: nullableInt,
    budgetPeriod: {
      anyOf: [{ type: "string", enum: ["month", "day", "semester", "total"] }, { type: "null" }],
    },
    accessNotes: { anyOf: [{ type: "string" }, { type: "null" }] },
    vehicleSize: {
      anyOf: [{ type: "string", enum: ["standard", "oversized"] }, { type: "null" }],
    },
    missing: { type: "array", maxItems: 6, items: { type: "string" } },
  },
}

export const RANKING_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "rankings"],
  properties: {
    summary: { type: "string" },
    rankings: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "fit", "explanation"],
        properties: {
          id: { type: "string" },
          fit: { type: "string", enum: ["strong", "possible", "limited"] },
          explanation: { type: "string" },
        },
      },
    },
  },
}

export const HOST_DRAFT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "category",
    "capacityLabel",
    "capacityCuFtMin",
    "capacityCuFtMax",
    "suitableFor",
    "restrictions",
    "neighborhood",
    "availableFrom",
    "availableUntil",
    "accessNotes",
    "omitted",
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    category: { type: "string", enum: ["storage", "monthly-parking"] },
    capacityLabel: { type: "string" },
    capacityCuFtMin: nullableInt,
    capacityCuFtMax: nullableInt,
    suitableFor: { type: "array", maxItems: 8, items: { type: "string" } },
    restrictions: { type: "array", maxItems: 8, items: { type: "string" } },
    neighborhood: neighborhoodSchema,
    availableFrom: nullableDate,
    availableUntil: nullableDate,
    accessNotes: { type: "string" },
    omitted: { type: "array", maxItems: 8, items: { type: "string" } },
  },
}

export function readRanking(value: unknown): { summary: string; rankings: { id: string; fit: "strong" | "possible" | "limited"; explanation: string }[] } | null {
  if (!value || typeof value !== "object") return null
  const summary = "summary" in value && typeof value.summary === "string" ? value.summary.trim() : ""
  const rows = "rankings" in value && Array.isArray(value.rankings) ? value.rankings : null
  if (!summary || !rows) return null
  const rankings = rows.flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const id = "id" in row && typeof row.id === "string" ? row.id : ""
    const fit = "fit" in row ? row.fit : ""
    const explanation = "explanation" in row && typeof row.explanation === "string" ? row.explanation.trim() : ""
    if (!id || !explanation) return []
    if (fit !== "strong" && fit !== "possible" && fit !== "limited") return []
    return [{ id, fit, explanation: explanation.slice(0, 500) }]
  })
  return { summary: summary.slice(0, 600), rankings }
}
