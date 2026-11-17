export const categories = [
  {
    id: "monthly-parking",
    label: "Monthly & semester parking",
    blurb: "A driveway or carport for the weeks you are actually in town.",
    image: "/images/driveway-modern.jpg",
    imageAlt: "A white house with a driveway and a garage door",
  },
  {
    id: "event-parking",
    label: "Football & event parking",
    blurb: "A lawn or apron near the stadium, offered for a single day.",
    image: "/images/front-lawn.jpg",
    imageAlt: "A house with a green lawn, a concrete driveway, and a garage",
  },
  {
    id: "storage",
    label: "Summer & semester storage",
    blurb: "A lockable garage for boxes, bikes, and the things between leases.",
    image: "/images/garage-workshop.jpg",
    imageAlt: "A garage interior with shelves, tools, and stored gear",
  },
  {
    id: "university-event",
    label: "Graduation & campus events",
    blurb: "A place to leave the car when the family is in town for a weekend.",
    image: "/images/front-porch.jpg",
    imageAlt: "A white car parked in a concrete driveway beside a house",
  },
] as const

export type CategoryId = (typeof categories)[number]["id"]

export const priceUnits = ["day", "month", "semester", "event"] as const
export type PriceUnit = (typeof priceUnits)[number]

export type Listing = {
  id: string
  title: string
  neighborhood: string
  city: string
  state: string
  category: CategoryId
  spaceType: string
  priceCents: number
  priceUnit: PriceUnit
  summary: string
  description: string
  image: string
  imageAlt: string
  hostName: string
  capacityLabel: string
  availableFrom: string
  availableUntil: string
  featured: boolean
  demo: boolean
}

export const neighborhoods = [
  "Burns Park",
  "Kerrytown",
  "Old West Side",
  "Water Hill",
  "South Main",
  "Eberwhite",
] as const

export type Neighborhood = (typeof neighborhoods)[number]

export const listings: Listing[] = [
  {
    id: "burns-park-driveway",
    title: "Two-car driveway on Olivia",
    neighborhood: "Burns Park",
    city: "Ann Arbor",
    state: "MI",
    category: "monthly-parking",
    spaceType: "Driveway",
    priceCents: 14500,
    priceUnit: "month",
    summary: "A driveway in front of a white house, a few blocks south of campus.",
    description:
      "Park one car, or two if you do not mind tandem. The sample host lives on the property and asks that you stay off the lawn and keep the sidewalk clear. This card is demo inventory, not a real offer.",
    image: "/images/driveway-modern.jpg",
    imageAlt: "A white house with a driveway and a garage door",
    hostName: "Elena M.",
    capacityLabel: "Two cars, one behind the other",
    availableFrom: "2026-08-25",
    availableUntil: "2027-04-30",
    featured: true,
    demo: true,
  },
  {
    id: "kerrytown-garage",
    title: "Lockable garage near Kerrytown",
    neighborhood: "Kerrytown",
    city: "Ann Arbor",
    state: "MI",
    category: "storage",
    spaceType: "Garage",
    priceCents: 11000,
    priceUnit: "month",
    summary: "A garage interior with shelves, tools, and stored gear along the walls.",
    description:
      "The sample photo shows a garage interior with shelves and equipment, not a climate-controlled room. The sample dates cover a summer lease gap. This card is demo inventory, not a real offer, and the photograph is not of a listed property.",
    image: "/images/garage-workshop.jpg",
    imageAlt: "A garage interior with shelves, tools, and stored gear",
    hostName: "Marcus L.",
    capacityLabel: "About one car’s worth of storage",
    availableFrom: "2026-05-01",
    availableUntil: "2026-08-20",
    featured: true,
    demo: true,
  },
  {
    id: "stadium-lawn",
    title: "Game-day spot off State Street",
    neighborhood: "Burns Park",
    city: "Ann Arbor",
    state: "MI",
    category: "event-parking",
    spaceType: "Lawn and apron",
    priceCents: 5500,
    priceUnit: "event",
    summary: "A front lawn and driveway apron for a home-game Saturday in this sample calendar.",
    description:
      "The sample host opens the lawn for football Saturdays inside the dates below. Arrive, park, and leave the same day. There is no overnight option on this listing. This card is demo inventory, not a real offer, and the dates are not an official schedule.",
    image: "/images/front-lawn.jpg",
    imageAlt: "A house with a green front lawn, a driveway, and a garage",
    hostName: "Priya S.",
    capacityLabel: "One car on the lawn or apron",
    availableFrom: "2026-09-05",
    availableUntil: "2026-11-21",
    featured: true,
    demo: true,
  },
  {
    id: "old-west-semester",
    title: "Semester parking on Seventh",
    neighborhood: "Old West Side",
    city: "Ann Arbor",
    state: "MI",
    category: "monthly-parking",
    spaceType: "Driveway",
    priceCents: 82000,
    priceUnit: "semester",
    summary: "One reserved driveway space from late August through the fall term.",
    description:
      "The sample photo shows a paved driveway leading to a garage. The sample term runs from move-in week to the last week of exams. You would come and go as a resident, not as a game-day guest. This card is demo inventory, not a real offer, and the photograph is not of a listed property.",
    image: "/images/brick-house.jpg",
    imageAlt: "A paved driveway leading to a garage in front of a house",
    hostName: "Jonah K.",
    capacityLabel: "One car",
    availableFrom: "2026-08-24",
    availableUntil: "2026-12-18",
    featured: true,
    demo: true,
  },
  {
    id: "water-hill-summer",
    title: "Summer storage in Water Hill",
    neighborhood: "Water Hill",
    city: "Ann Arbor",
    state: "MI",
    category: "storage",
    spaceType: "Garage bay",
    priceCents: 9500,
    priceUnit: "month",
    summary: "A garage bay with shelves and stored gear, for the months between leases.",
    description:
      "The sample photo shows a garage interior with shelves and stored items. It is not a place to store a car for the summer, and it is not climate controlled. This card is demo inventory, not a real offer, and the photograph is not of a listed property.",
    image: "/images/storage-boxes.jpg",
    imageAlt: "A garage interior with shelves, tools, and stored items",
    hostName: "Helen C.",
    capacityLabel: "Stored gear, not a vehicle",
    availableFrom: "2026-05-04",
    availableUntil: "2026-08-22",
    featured: true,
    demo: true,
  },
  {
    id: "packard-graduation",
    title: "Graduation weekend on Packard",
    neighborhood: "Burns Park",
    city: "Ann Arbor",
    state: "MI",
    category: "university-event",
    spaceType: "Driveway",
    priceCents: 7000,
    priceUnit: "day",
    summary: "A driveway for the Friday through Sunday when families fill the neighborhood.",
    description:
      "The sample photo shows a car parked in a driveway beside a house. The sample window is a commencement weekend. The listing does not include a place to stay. This card is demo inventory, not a real offer, and the photograph is not of a listed property.",
    image: "/images/front-porch.jpg",
    imageAlt: "A white car parked in a concrete driveway beside a house",
    hostName: "Andre P.",
    capacityLabel: "One car in the driveway",
    availableFrom: "2027-04-30",
    availableUntil: "2027-05-03",
    featured: true,
    demo: true,
  },
  {
    id: "south-main-carport",
    title: "Covered parking off South Main",
    neighborhood: "South Main",
    city: "Ann Arbor",
    state: "MI",
    category: "monthly-parking",
    spaceType: "Carport",
    priceCents: 16000,
    priceUnit: "month",
    summary: "A covered space for someone who keeps a car through the sample season.",
    description:
      "The sample photo shows a car parked under a carport beside a house. The sample host wants a monthly parker, not a rotation of weekend guests. This card is demo inventory, not a real offer, and the photograph is not of a listed property.",
    image: "/images/evening-driveway.jpg",
    imageAlt: "A car parked under a carport beside a house",
    hostName: "Ruth A.",
    capacityLabel: "One car, covered",
    availableFrom: "2026-09-01",
    availableUntil: "2027-05-10",
    featured: false,
    demo: true,
  },
  {
    id: "eberwhite-saturday",
    title: "Saturday parking in Eberwhite",
    neighborhood: "Eberwhite",
    city: "Ann Arbor",
    state: "MI",
    category: "event-parking",
    spaceType: "Driveway",
    priceCents: 4000,
    priceUnit: "event",
    summary: "A quieter driveway west of campus for the Saturdays in this sample window.",
    description:
      "The sample photo shows a house with a concrete driveway and a small lawn. Farther from the stadium than the Burns Park listing, and priced that way. One car, in and out the same day. This card is demo inventory, not a real offer, and the photograph is not of a listed property.",
    image: "/images/brick-street.jpg",
    imageAlt: "A suburban house with a concrete driveway and a small front lawn",
    hostName: "Chris F.",
    capacityLabel: "One car",
    availableFrom: "2026-09-12",
    availableUntil: "2026-10-31",
    featured: false,
    demo: true,
  },
]

export type CatalogQuery = {
  category: CategoryId | ""
  neighborhood: Neighborhood | ""
  from: string
  until: string
  /** Sanitized words. Empty means no text filter. */
  q: string
}

const categoryIds = new Set<string>(categories.map((category) => category.id))
const neighborhoodNames = new Set<string>(neighborhoods)

export function isCategoryId(value: string): value is CategoryId {
  return categoryIds.has(value)
}

export function isNeighborhood(value: string): value is Neighborhood {
  return neighborhoodNames.has(value)
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

/** Words used to match a listing title, summary, or description. Wildcards are removed. */
export function listingTextTerm(raw: string): string {
  return raw
    .replace(/[%_\\(),."]/g, " ")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
}

export function listingSearchOr(term: string): string | null {
  const cleaned = listingTextTerm(term)
  if (!cleaned) return null
  const pattern = `"*${cleaned}*"`
  return `title.ilike.${pattern},summary.ilike.${pattern},description.ilike.${pattern}`
}

export function parseCatalogQuery(
  raw: Record<string, string | string[] | undefined>,
): CatalogQuery {
  const category = firstParam(raw.category)
  const neighborhood = firstParam(raw.neighborhood)
  const from = firstParam(raw.from)
  const until = firstParam(raw.until)

  return {
    category: isCategoryId(category) ? category : "",
    neighborhood: isNeighborhood(neighborhood) ? neighborhood : "",
    from: isIsoDate(from) ? from : "",
    until: isIsoDate(until) ? until : "",
    q: listingTextTerm(firstParam(raw.q)),
  }
}

export function requestedRange(query: CatalogQuery): [string, string] | null {
  const start = query.from || query.until
  const end = query.until || query.from
  if (!start || !end) return null
  return start <= end ? [start, end] : [end, start]
}

export function filterListings(source: Listing[], query: CatalogQuery): Listing[] {
  const range = requestedRange(query)

  const needle = listingTextTerm(query.q).toLowerCase()

  return source.filter((listing) => {
    if (query.category && listing.category !== query.category) return false
    if (query.neighborhood && listing.neighborhood !== query.neighborhood) return false
    if (range && (range[0] < listing.availableFrom || range[1] > listing.availableUntil)) {
      return false
    }
    if (needle) {
      const haystack = `${listing.title} ${listing.summary} ${listing.description}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}

export function getListing(id: string): Listing | undefined {
  return listings.find((listing) => listing.id === id)
}

export function categoryLabel(id: CategoryId): string {
  return categories.find((category) => category.id === id)?.label ?? id
}

const priceUnitLabels: Record<PriceUnit, string> = {
  day: "day",
  month: "month",
  semester: "semester",
  event: "event",
}

export function formatPrice(cents: number, unit: PriceUnit): string {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
  return `${amount} / ${priceUnitLabels[unit]}`
}

export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatAvailability(listing: Listing): string {
  return `${formatIsoDate(listing.availableFrom)} – ${formatIsoDate(listing.availableUntil)}`
}

export function sampleHostSentence(hostName: string, availability: string): string {
  const host = hostName.trim().replace(/\.+$/, "")
  return `Sample host: ${host}. Available ${availability}.`
}

export function describeQuery(query: CatalogQuery): string {
  const parts: string[] = []
  if (query.q) parts.push(`matching “${query.q}”`)
  if (query.category) parts.push(categoryLabel(query.category))
  if (query.neighborhood) parts.push(`in ${query.neighborhood}`)
  if (query.from || query.until) {
    const start = query.from || query.until
    const end = query.until || query.from
    const [from, until] = start <= end ? [start, end] : [end, start]
    parts.push(
      from === until
        ? `on ${formatIsoDate(from)}`
        : `from ${formatIsoDate(from)} to ${formatIsoDate(until)}`,
    )
  }
  if (parts.length === 0) return "Spaces in Ann Arbor"
  return parts.join(" ")
}

export function queryToSearchParams(query: CatalogQuery): string {
  const params = new URLSearchParams()
  if (query.category) params.set("category", query.category)
  if (query.neighborhood) params.set("neighborhood", query.neighborhood)
  if (query.from) params.set("from", query.from)
  if (query.until) params.set("until", query.until)
  if (query.q) params.set("q", query.q)
  const value = params.toString()
  return value ? `?${value}` : ""
}
