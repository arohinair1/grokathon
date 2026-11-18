import type { RequestedItem } from "@/lib/spacematch/types"

/** Approximate volume each item occupies, not the interior of a container. */
export const VOLUME_CUFT: Record<RequestedItem["kind"], [number, number] | null> = {
  boxes: [2, 4],
  luggage: [3, 6],
  miniFridge: [10, 18],
  bicycle: [10, 20],
  vehicle: null,
  other: [2, 8],
}

export const VOLUME_NOTES = [
  "A moving box is estimated at 2–4 cubic feet. Large boxes need more.",
  "A suitcase is estimated at 3–6 cubic feet.",
  "A mini-fridge is estimated at 10–18 cubic feet of floor space, including a little clearance. That is not its interior volume.",
  "A bicycle is estimated at 10–20 cubic feet. A cargo bike needs more.",
  "These ranges are estimates. Exact dimensions were not provided.",
]

export function estimateCapacity(items: RequestedItem[]): { min: number | null; max: number | null; assumptions: string } {
  let min = 0
  let max = 0
  let counted = 0
  for (const item of items) {
    const span = VOLUME_CUFT[item.kind]
    if (!span) continue
    const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1
    min += span[0] * quantity
    max += span[1] * quantity
    counted += 1
  }
  if (counted === 0) {
    return {
      min: null,
      max: null,
      assumptions: "No volume estimate. The request did not include belongings with a known size range.",
    }
  }
  return {
    min,
    max,
    assumptions: VOLUME_NOTES.join(" "),
  }
}

const MONTHS: { name: string; number: number }[] = [
  { name: "january", number: 1 },
  { name: "february", number: 2 },
  { name: "march", number: 3 },
  { name: "april", number: 4 },
  { name: "may", number: 5 },
  { name: "june", number: 6 },
  { name: "july", number: 7 },
  { name: "august", number: 8 },
  { name: "september", number: 9 },
  { name: "october", number: 10 },
  { name: "november", number: 11 },
  { name: "december", number: 12 },
]

export function yaleToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function isoDate(year: number, month: number, day: number): string {
  const capped = Math.min(day, lastDayOfMonth(year, month))
  return `${year}-${String(month).padStart(2, "0")}-${String(capped).padStart(2, "0")}`
}

function monthHits(text: string): { number: number; index: number; day: number | null }[] {
  const lower = text.toLowerCase()
  const hits: { number: number; index: number; day: number | null }[] = []
  for (const month of MONTHS) {
    const pattern = new RegExp(`\\b${month.name}\\b(?:\\s+(\\d{1,2}))?`, "g")
    for (const match of lower.matchAll(pattern)) {
      const day = match[1] ? Number(match[1]) : null
      hits.push({
        number: month.number,
        index: match.index ?? 0,
        day: day && day >= 1 && day <= 31 ? day : null,
      })
    }
  }
  return hits.sort((a, b) => a.index - b.index)
}

/**
 * Turn month language into an inclusive window.
 * A range that has already ended relative to `today` moves to the next year.
 * Exact ISO dates in the text win.
 */
export function interpretDates(
  text: string,
  today: string,
): { from: string; until: string; exact: boolean } | null {
  const iso = [...text.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)].map((match) => match[1])
  if (iso.length >= 2) {
    const [from, until] = iso[0] <= iso[1] ? [iso[0], iso[1]] : [iso[1], iso[0]]
    return { from, until, exact: true }
  }
  if (iso.length === 1) return { from: iso[0], until: iso[0], exact: true }

  const hits = monthHits(text)
  if (hits.length === 0 && /\bweekend\b/i.test(text)) return nextWeekend(today)
  if (hits.length === 0 && /\bsummer\b/i.test(text)) return summerWindow(today)
  if (hits.length === 0) return null
  const start = hits[0]
  const end = hits[hits.length - 1]
  const todayYear = Number(today.slice(0, 4))
  const wraps = end.number < start.number
  let endYear = todayYear + (wraps ? 1 : 0)
  const endDay = end.day ?? lastDayOfMonth(endYear, end.number)
  let until = isoDate(endYear, end.number, endDay)
  if (until < today) {
    endYear += 1
    until = isoDate(endYear, end.number, end.day ?? lastDayOfMonth(endYear, end.number))
  }
  const startYear = wraps ? endYear - 1 : endYear
  const from = isoDate(startYear, start.number, start.day ?? 1)
  return {
    from,
    until: from <= until ? until : from,
    exact: start.day !== null && end.day !== null,
  }
}

/** Next Saturday through Sunday. A request made on Saturday uses that Saturday. */
export function nextWeekend(today: string): { from: string; until: string; exact: boolean } {
  const [year, month, day] = today.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = date.getUTCDay()
  const daysUntilSaturday = dayOfWeek === 6 ? 0 : dayOfWeek === 0 ? 6 : 6 - dayOfWeek
  date.setUTCDate(date.getUTCDate() + daysUntilSaturday)
  const from = date.toISOString().slice(0, 10)
  date.setUTCDate(date.getUTCDate() + 1)
  return { from, until: date.toISOString().slice(0, 10), exact: false }
}

/** May 1 through August 31. A summer that has already ended moves to the next year. */
export function summerWindow(today: string): { from: string; until: string; exact: boolean } {
  let year = Number(today.slice(0, 4))
  let until = isoDate(year, 8, 31)
  if (until < today) {
    year += 1
    until = isoDate(year, 8, 31)
  }
  return { from: isoDate(year, 5, 1), until, exact: false }
}
