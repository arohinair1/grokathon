import { filterListings, listings, type CatalogQuery, type Listing } from "@/lib/catalog"
import {
  ANN_ARBOR_COLLEGE,
  collegeSearchTerm,
  isMarketStatus,
  stateSlug,
  type CollegeSummary,
  type StateSummary,
} from "@/lib/directory"
import { searchListings } from "@/lib/repository"
import { createAnonClient } from "@/lib/supabase"

function schemaMissing(error: { code?: string } | null): boolean {
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST200" ||
    error?.code === "PGRST202" ||
    error?.code === "PGRST204" ||
    error?.code === "PGRST205"
  )
}

type CollegeRecord = {
  id: string
  slug: string
  name: string
  city: string
  state_code: string
  market_status: string
  state_name?: string
  states?: { name: string } | { name: string }[] | null
}

function stateNameOf(record: CollegeRecord): string {
  if (record.state_name) return record.state_name
  const embedded = record.states
  if (Array.isArray(embedded)) return embedded[0]?.name ?? record.state_code
  return embedded?.name ?? record.state_code
}

function toCollege(record: CollegeRecord): CollegeSummary | null {
  if (!isMarketStatus(record.market_status)) return null
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    city: record.city,
    stateCode: String(record.state_code).trim(),
    stateName: stateNameOf(record),
    marketStatus: record.market_status,
  }
}

const collegeColumns = "id, slug, name, city, state_code, market_status, states(name)"

function fileStates(): StateSummary[] {
  return [{ code: "MI", name: "Michigan", slug: "michigan", collegeCount: 1, activeCount: 1 }]
}

export async function listDirectoryStates(): Promise<StateSummary[] | null> {
  const client = createAnonClient()
  if (!client) return fileStates()
  const rpc = await client.rpc("directory_states")
  if (!rpc.error && Array.isArray(rpc.data)) {
    return rpc.data.map((row: { code: string; name: string; college_count: number; active_count: number }) => ({
      code: String(row.code).trim(),
      name: row.name,
      slug: stateSlug(row.name),
      collegeCount: Number(row.college_count),
      activeCount: Number(row.active_count),
    }))
  }
  if (rpc.error && !schemaMissing(rpc.error)) return null
  const { data, error } = await client.from("colleges").select("state_code, market_status, states(name)").limit(8000)
  if (schemaMissing(error)) return fileStates()
  if (error || !data) return null
  const grouped = new Map<string, StateSummary>()
  for (const row of data as CollegeRecord[]) {
    const code = String(row.state_code).trim()
    const name = stateNameOf(row)
    const current = grouped.get(code) ?? {
      code,
      name,
      slug: stateSlug(name),
      collegeCount: 0,
      activeCount: 0,
    }
    current.collegeCount += 1
    if (row.market_status === "active") current.activeCount += 1
    grouped.set(code, current)
  }
  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export async function listCollegesInState(
  stateCode: string,
): Promise<{ colleges: CollegeSummary[]; total: number } | null> {
  const client = createAnonClient()
  if (!client) return { colleges: stateCode === "MI" ? [ANN_ARBOR_COLLEGE] : [], total: stateCode === "MI" ? 1 : 0 }
  const { data, error, count } = await client
    .from("colleges")
    .select(collegeColumns, { count: "exact" })
    .eq("state_code", stateCode)
    .order("market_status", { ascending: true })
    .order("name", { ascending: true })
    .limit(1000)
  if (schemaMissing(error)) return { colleges: stateCode === "MI" ? [ANN_ARBOR_COLLEGE] : [], total: stateCode === "MI" ? 1 : 0 }
  if (error || !data) return null
  const colleges = (data as CollegeRecord[]).flatMap((row) => {
    const college = toCollege(row)
    return college ? [college] : []
  })
  return { colleges, total: count ?? colleges.length }
}

export async function getCollege(slug: string): Promise<CollegeSummary | null> {
  const client = createAnonClient()
  if (!client) return slug === ANN_ARBOR_COLLEGE.slug ? ANN_ARBOR_COLLEGE : null
  const { data, error } = await client.from("colleges").select(collegeColumns).eq("slug", slug).maybeSingle()
  if (schemaMissing(error)) return slug === ANN_ARBOR_COLLEGE.slug ? ANN_ARBOR_COLLEGE : null
  if (error || !data) return null
  return toCollege(data as CollegeRecord)
}

export async function searchColleges(raw: string, limit = 8): Promise<CollegeSummary[] | null> {
  const term = collegeSearchTerm(raw)
  if (!term) return []
  const client = createAnonClient()
  if (!client) return fileSearch(term).slice(0, limit)
  const rpc = await client.rpc("search_colleges", { term, result_limit: limit })
  if (!rpc.error && Array.isArray(rpc.data)) {
    return (rpc.data as CollegeRecord[]).flatMap((row) => {
      const college = toCollege(row)
      return college ? [college] : []
    })
  }
  if (rpc.error && !schemaMissing(rpc.error)) return null
  const [active, rest] = await Promise.all([
    client.from("colleges").select(collegeColumns).ilike("name", `%${term}%`).eq("market_status", "active").limit(limit),
    client.from("colleges").select(collegeColumns).ilike("name", `%${term}%`).neq("market_status", "active").order("name").limit(limit),
  ])
  if (schemaMissing(active.error) || schemaMissing(rest.error)) return fileSearch(term).slice(0, limit)
  if (active.error || rest.error || !active.data || !rest.data) return null
  const seen = new Set<string>()
  return [...(active.data as CollegeRecord[]), ...(rest.data as CollegeRecord[])].flatMap((row) => {
    const college = toCollege(row)
    if (!college || seen.has(college.id)) return []
    seen.add(college.id)
    return [college]
  }).slice(0, limit)
}

export async function listingsForCollege(college: CollegeSummary, query: CatalogQuery): Promise<Listing[]> {
  if (college.marketStatus !== "active") return []
  const client = createAnonClient()
  if (!client) return college.slug === ANN_ARBOR_COLLEGE.slug ? filterListings(listings, query) : []
  return searchListings(query, college.id)
}

function fileSearch(term: string): CollegeSummary[] {
  const needle = term.toLowerCase()
  const haystack = `${ANN_ARBOR_COLLEGE.name} ${ANN_ARBOR_COLLEGE.city} Michigan`.toLowerCase()
  return haystack.includes(needle) ? [ANN_ARBOR_COLLEGE] : []
}
