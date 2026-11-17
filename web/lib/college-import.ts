import { slugifyCollegeName, uniqueCollegeSlug, type MarketStatus } from "./directory.ts"

export type DirectoryRow = {
  unitId: string
  name: string
  city: string
  stateCode: string
  aliases: string[]
  closed: boolean
}

export type ExistingCollege = {
  id: string
  slug: string
  name: string
  city: string
  stateCode: string
  marketStatus: string
  sourceId: string | null
}

export type ImportAction = {
  kind: "insert" | "update"
  id: string | null
  slug: string
  name: string
  city: string
  stateCode: string
  sourceId: string
  aliases: string[]
  marketStatus: MarketStatus | null
}

const US_STATES = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" "),
)

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  const source = text.replace(/^\uFEFF/, "")
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === ",") {
      row.push(cell)
      cell = ""
      continue
    }
    if (char === "\n") {
      row.push(cell.replace(/\r$/, ""))
      rows.push(row)
      row = []
      cell = ""
      continue
    }
    cell += char
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ""))
    rows.push(row)
  }
  return rows.filter((item) => item.some((value) => value.length > 0))
}

function headerIndex(headers: string[], name: string): number {
  return headers.findIndex((header) => header.replace(/^\uFEFF/, "").trim().toUpperCase() === name)
}

function blankCode(value: string | undefined): boolean {
  const trimmed = (value ?? "").trim()
  return trimmed === "" || trimmed === "-2"
}

export function parseIpedsDirectory(text: string): { rows: DirectoryRow[]; rejected: number } {
  const table = parseCsv(text)
  if (table.length === 0) return { rows: [], rejected: 0 }
  const headers = table[0]
  const unitId = headerIndex(headers, "UNITID")
  const name = headerIndex(headers, "INSTNM")
  const city = headerIndex(headers, "CITY")
  const state = headerIndex(headers, "STABBR")
  const alias = headerIndex(headers, "IALIAS")
  const active = headerIndex(headers, "CYACTIVE")
  const closed = headerIndex(headers, "CLOSEDAT")
  const merged = headerIndex(headers, "NEWID")
  if (unitId < 0 || name < 0 || city < 0 || state < 0) {
    throw new Error("IPEDS directory is missing UNITID, INSTNM, CITY, or STABBR")
  }
  const rows: DirectoryRow[] = []
  let rejected = 0
  for (const record of table.slice(1)) {
    const unit = (record[unitId] ?? "").trim()
    const institution = (record[name] ?? "").trim()
    const stateCode = (record[state] ?? "").trim().toUpperCase()
    if (!/^\d{4,8}$/.test(unit) || institution.length < 2) {
      rejected += 1
      continue
    }
    const aliases = (alias >= 0 ? record[alias] ?? "" : "")
      .split("|")
      .map((item) => item.trim())
      .filter((item) => item.length >= 2 && item.length <= 160)
      .filter((item, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
      .slice(0, 8)
    const isClosed =
      (active >= 0 && (record[active] ?? "").trim() !== "1") ||
      (closed >= 0 && !blankCode(record[closed])) ||
      (merged >= 0 && !blankCode(record[merged]))
    rows.push({
      unitId: unit,
      name: institution.slice(0, 160),
      city: (record[city] ?? "").trim().slice(0, 80) || "Unknown",
      stateCode,
      aliases: aliases.filter((item) => item.toLowerCase() !== institution.toLowerCase()),
      closed: isClosed || !US_STATES.has(stateCode),
    })
  }
  return { rows, rejected }
}

export function planCollegeImport(existing: ExistingCollege[], rows: DirectoryRow[]): {
  actions: ImportAction[]
  skipped: number
  preservedActive: number
} {
  const bySource = new Map(existing.filter((college) => college.sourceId).map((college) => [college.sourceId as string, college]))
  const unsourced = new Map(existing.filter((college) => !college.sourceId).map((college) => [college.slug, college]))
  const taken = new Set(existing.map((college) => college.slug))
  const actions: ImportAction[] = []
  let skipped = 0
  let preservedActive = 0
  for (const row of rows) {
    if (row.closed || !US_STATES.has(row.stateCode)) {
      skipped += 1
      continue
    }
    const current = bySource.get(row.unitId) ?? unsourced.get(slugifyCollegeName(row.name))
    if (current && !bySource.has(row.unitId)) unsourced.delete(current.slug)
    if (current) {
      const active = current.marketStatus === "active"
      if (active) preservedActive += 1
      actions.push({
        kind: "update",
        id: current.id,
        slug: current.slug,
        name: active ? current.name : row.name,
        city: active ? current.city : row.city,
        stateCode: active ? current.stateCode : row.stateCode,
        sourceId: row.unitId,
        aliases: row.aliases,
        marketStatus: null,
      })
      bySource.set(row.unitId, current)
      continue
    }
    const slug = uniqueCollegeSlug(row.name, row.city, row.stateCode, row.unitId, taken)
    taken.add(slug)
    actions.push({
      kind: "insert",
      id: null,
      slug,
      name: row.name,
      city: row.city,
      stateCode: row.stateCode,
      sourceId: row.unitId,
      aliases: row.aliases,
      marketStatus: "planned",
    })
  }
  return { actions, skipped, preservedActive }
}
