export type MarketStatus = "planned" | "active" | "paused"

export type CollegeSummary = {
  id: string
  slug: string
  name: string
  city: string
  stateCode: string
  stateName: string
  marketStatus: MarketStatus
}

export type StateSummary = {
  code: string
  name: string
  slug: string
  collegeCount: number
  activeCount: number
}

export const ANN_ARBOR_COLLEGE: CollegeSummary = {
  id: "a0000000-0000-4000-8000-000000000001",
  slug: "university-of-michigan-ann-arbor",
  name: "University of Michigan–Ann Arbor",
  city: "Ann Arbor",
  stateCode: "MI",
  stateName: "Michigan",
  marketStatus: "active",
}

export function stateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function stateBySlug(states: StateSummary[], slug: string): StateSummary | null {
  return states.find((state) => state.slug === slug) ?? null
}

export function marketLabel(status: string): string {
  if (status === "active") return "Open"
  if (status === "paused") return "Paused"
  return "Coming soon"
}

export function isMarketStatus(value: string): value is MarketStatus {
  return value === "planned" || value === "active" || value === "paused"
}

/** A directory search needs two characters and must not carry SQL wildcards. */
export function collegeSearchTerm(raw: string): string | null {
  const cleaned = raw.replace(/[%_\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80)
  if (cleaned.length < 2) return null
  return cleaned
}

export function slugifyCollegeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90)
}

export function uniqueCollegeSlug(name: string, city: string, stateCode: string, unitId: string, taken: Set<string>): string {
  const base = slugifyCollegeName(name) || `college-${unitId}`
  if (!taken.has(base)) return base
  const withPlace = `${base}-${slugifyCollegeName(city)}-${stateCode.toLowerCase()}`.replace(/^-|-$/g, "")
  if (!taken.has(withPlace)) return withPlace
  return `${withPlace}-${unitId}`
}

export function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    result.push(row)
  }
  return result
}
