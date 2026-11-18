import type { CategoryId, Listing, PriceUnit } from "@/lib/catalog"

/** Distinct from the Ann Arbor college row. This demo market is not a hosted launch. */
export const YALE_COLLEGE = {
  id: "b0000000-0000-4000-8000-0000000000aa",
  slug: "yale-university",
  name: "Yale University",
  city: "New Haven",
  stateCode: "CT",
  stateName: "Connecticut",
  marketStatus: "demo" as const,
}

export const YALE_NEIGHBORHOODS = [
  "Old Campus",
  "Broadway",
  "Science Hill",
  "Dwight",
  "East Rock",
  "Downtown New Haven",
] as const

export type YaleNeighborhood = (typeof YALE_NEIGHBORHOODS)[number]

export type YaleAccepts = {
  boxes: boolean
  luggage: boolean
  miniFridge: boolean
  bicycle: boolean
  vehicle: boolean
}

export type YaleListing = Listing & {
  market: "yale"
  neighborhood: YaleNeighborhood
  city: "New Haven"
  state: "CT"
  capacityCuFtMin: number | null
  capacityCuFtMax: number | null
  suitableFor: string[]
  accessNotes: string
  restrictions: string[]
  accepts: YaleAccepts
  vehicleLimit: "standard-car" | null
  illustrativePrice: true
}

type Draft = Omit<YaleListing, "market" | "city" | "state" | "demo" | "illustrativePrice" | "hostName"> & {
  hostName?: string
}

function listing(draft: Draft): YaleListing {
  return {
    ...draft,
    market: "yale",
    city: "New Haven",
    state: "CT",
    demo: true,
    illustrativePrice: true,
    hostName: "Sample host",
  }
}

export const yaleListings: YaleListing[] = [
  listing({
    id: "old-campus-summer-storage",
    title: "Summer storage near Old Campus",
    neighborhood: "Old Campus",
    category: "storage",
    spaceType: "Lockable closet",
    priceCents: 9500,
    priceUnit: "month",
    summary: "A sample closet-sized space for boxes and luggage over a summer away from campus.",
    description:
      "Sample listing for the Yale demo. The photograph is not a New Haven address and not this space. The sample host describes a lockable closet in an apartment they are allowed to use, within walking distance of Old Campus. It is not a dorm room and not a university facility. A mini-fridge may fit if you confirm the dimensions. Access is arranged on weekends.",
    image: "/images/storage-boxes.jpg",
    imageAlt: "A garage interior with shelves and stored items, used as a sample photo",
    capacityLabel: "About 40–70 cubic feet",
    capacityCuFtMin: 40,
    capacityCuFtMax: 70,
    suitableFor: ["Moving boxes", "Suitcases", "A mini-fridge if the host confirms the size"],
    accessNotes: "Weekend access by arrangement. Not a daily drop-in.",
    restrictions: ["No vehicles.", "No perishable food."],
    accepts: { boxes: true, luggage: true, miniFridge: true, bicycle: false, vehicle: false },
    vehicleLimit: null,
    availableFrom: "2027-05-01",
    availableUntil: "2027-08-31",
    featured: true,
  }),
  listing({
    id: "broadway-small-closet",
    title: "Small closet near Broadway",
    neighborhood: "Broadway",
    category: "storage",
    spaceType: "Closet",
    priceCents: 6500,
    priceUnit: "month",
    summary: "A smaller sample closet for luggage and a few boxes, not a fridge or a bike.",
    description:
      "Sample listing for the Yale demo. The photograph is not a listed property. The sample space is a closet in an apartment near Broadway. It suits suitcases and a short stack of boxes. It does not fit a mini-fridge or a bicycle. Access is on weekday evenings.",
    image: "/images/craftsman.jpg",
    imageAlt: "A house exterior used as a sample photo, not a listed address",
    capacityLabel: "About 18–32 cubic feet",
    capacityCuFtMin: 18,
    capacityCuFtMax: 32,
    suitableFor: ["Suitcases", "A few moving boxes"],
    accessNotes: "Weekday evenings, arranged in advance.",
    restrictions: ["No mini-fridge.", "No bicycle.", "No vehicles."],
    accepts: { boxes: true, luggage: true, miniFridge: false, bicycle: false, vehicle: false },
    vehicleLimit: null,
    availableFrom: "2027-05-01",
    availableUntil: "2027-08-15",
    featured: true,
  }),
  listing({
    id: "dwight-apartment-corner",
    title: "Apartment corner near Dwight",
    neighborhood: "Dwight",
    category: "storage",
    spaceType: "Apartment corner",
    priceCents: 12000,
    priceUnit: "month",
    summary: "A sample corner of an off-campus apartment with room for boxes, luggage, and possibly a mini-fridge.",
    description:
      "Sample listing for the Yale demo. The photograph is not a Dwight address. The sample host has a dry corner they are allowed to rent, near the Dwight neighborhood. Weekend access. Confirm a mini-fridge before you count on it. This is not university housing.",
    image: "/images/side-yard.jpg",
    imageAlt: "An indoor stair used as a sample photo, not a listed property",
    capacityLabel: "About 90–130 cubic feet",
    capacityCuFtMin: 90,
    capacityCuFtMax: 130,
    suitableFor: ["Moving boxes", "Suitcases", "A mini-fridge if the host confirms the size"],
    accessNotes: "Weekends, with notice the day before.",
    restrictions: ["No vehicles.", "No bicycles."],
    accepts: { boxes: true, luggage: true, miniFridge: true, bicycle: false, vehicle: false },
    vehicleLimit: null,
    availableFrom: "2027-05-15",
    availableUntil: "2027-08-25",
    featured: true,
  }),
  listing({
    id: "east-rock-larger-storage",
    title: "Larger storage near East Rock",
    neighborhood: "East Rock",
    category: "storage",
    spaceType: "Basement section",
    priceCents: 16000,
    priceUnit: "month",
    summary: "A larger sample basement section for boxes, a bike, and a mini-fridge over the summer.",
    description:
      "Sample listing for the Yale demo. The photograph shows a garage interior and is not the listed space. The sample is a lockable section of a basement near East Rock, offered by someone who says they have permission to rent it. It is not climate controlled. Access is scheduled, not around the clock.",
    image: "/images/garage-workshop.jpg",
    imageAlt: "A garage interior with shelves and tools, used as a sample photo",
    capacityLabel: "About 170–250 cubic feet",
    capacityCuFtMin: 170,
    capacityCuFtMax: 250,
    suitableFor: ["Moving boxes", "Suitcases", "A bicycle", "A mini-fridge", "A small piece of furniture"],
    accessNotes: "Scheduled access on weekday evenings or weekends.",
    restrictions: ["Not climate controlled.", "No vehicles.", "No perishable food."],
    accepts: { boxes: true, luggage: true, miniFridge: true, bicycle: true, vehicle: false },
    vehicleLimit: null,
    availableFrom: "2027-05-01",
    availableUntil: "2027-08-31",
    featured: true,
  }),
  listing({
    id: "science-hill-shelf",
    title: "Shelf space near Science Hill",
    neighborhood: "Science Hill",
    category: "storage",
    spaceType: "Shelved closet",
    priceCents: 8500,
    priceUnit: "month",
    summary: "Sample shelves near Science Hill for boxes and bags, without room for a fridge or a bike.",
    description:
      "Sample listing for the Yale demo. The photograph is not a Science Hill address. The sample space is a shelved closet in an apartment near Science Hill. It fits boxes and soft bags. A mini-fridge and a bicycle are out. Weekday evening access.",
    image: "/images/brick-house.jpg",
    imageAlt: "A house and driveway used as a sample photo, not a listed address",
    capacityLabel: "About 45–75 cubic feet",
    capacityCuFtMin: 45,
    capacityCuFtMax: 75,
    suitableFor: ["Moving boxes", "Bags and backpacks"],
    accessNotes: "Weekday evenings by arrangement.",
    restrictions: ["No mini-fridge.", "No bicycle.", "No vehicles."],
    accepts: { boxes: true, luggage: true, miniFridge: false, bicycle: false, vehicle: false },
    vehicleLimit: null,
    availableFrom: "2027-05-20",
    availableUntil: "2027-08-18",
    featured: false,
  }),
  listing({
    id: "downtown-storage-room",
    title: "Storage corner downtown",
    neighborhood: "Downtown New Haven",
    category: "storage",
    spaceType: "Spare-room corner",
    priceCents: 13500,
    priceUnit: "month",
    summary: "A sample spare-room corner downtown for boxes, luggage, and a bike.",
    description:
      "Sample listing for the Yale demo. The photograph is not a downtown address. The sample host describes a dry corner of a spare room in an apartment near downtown New Haven that they are allowed to offer. Weekend access. A mini-fridge needs a confirmation on size and outlet use. There is no claim of an outlet in this sample.",
    image: "/images/front-porch.jpg",
    imageAlt: "A car in a driveway used as a sample photo, not a listed property",
    capacityLabel: "About 110–160 cubic feet",
    capacityCuFtMin: 110,
    capacityCuFtMax: 160,
    suitableFor: ["Moving boxes", "Suitcases", "A bicycle", "A mini-fridge if the host confirms the size"],
    accessNotes: "Weekend access. Ask before any weekday visit.",
    restrictions: ["No vehicles.", "Outlet use is not included unless the host confirms it."],
    accepts: { boxes: true, luggage: true, miniFridge: true, bicycle: true, vehicle: false },
    vehicleLimit: null,
    availableFrom: "2027-06-01",
    availableUntil: "2027-08-22",
    featured: true,
  }),
  listing({
    id: "dwight-locked-cage",
    title: "Locked cage near Dwight",
    neighborhood: "Dwight",
    category: "storage",
    spaceType: "Storage cage",
    priceCents: 7800,
    priceUnit: "month",
    summary: "A sample locked cage for boxes only, at a lower illustrative price.",
    description:
      "Sample listing for the Yale demo. The photograph is not the space. The sample is a locked cage near Dwight for sealed moving boxes. Luggage, bikes, food, and appliances are outside what the sample host is offering. The window ends in July, before a full summer.",
    image: "/images/brick-street.jpg",
    imageAlt: "A residential street used as a sample photo, not a listed address",
    capacityLabel: "About 55–85 cubic feet",
    capacityCuFtMin: 55,
    capacityCuFtMax: 85,
    suitableFor: ["Sealed moving boxes"],
    accessNotes: "One scheduled visit to drop off and one to pick up.",
    restrictions: ["Boxes only.", "No luggage.", "No bicycle.", "No mini-fridge.", "No food or liquids."],
    accepts: { boxes: true, luggage: false, miniFridge: false, bicycle: false, vehicle: false },
    vehicleLimit: null,
    availableFrom: "2027-05-01",
    availableUntil: "2027-07-31",
    featured: false,
  }),
  listing({
    id: "old-campus-bike-nook",
    title: "Bike nook near Old Campus",
    neighborhood: "Old Campus",
    category: "storage",
    spaceType: "Narrow nook",
    priceCents: 7000,
    priceUnit: "month",
    summary: "A narrow sample nook for a bicycle and a couple of boxes near Old Campus.",
    description:
      "Sample listing for the Yale demo. The photograph is not a campus address. The sample space is a narrow nook, enough for one bicycle and about two boxes. It will not take a mini-fridge or a full set of luggage. The sample host asks for a message before each visit.",
    image: "/images/front-lawn.jpg",
    imageAlt: "A house and lawn used as a sample photo, not a listed property",
    capacityLabel: "About 25–45 cubic feet",
    capacityCuFtMin: 25,
    capacityCuFtMax: 45,
    suitableFor: ["One bicycle", "Two moving boxes"],
    accessNotes: "Message ahead before each visit.",
    restrictions: ["No mini-fridge.", "No extra luggage beyond what shares the nook with the bike."],
    accepts: { boxes: true, luggage: false, miniFridge: false, bicycle: true, vehicle: false },
    vehicleLimit: null,
    availableFrom: "2027-05-05",
    availableUntil: "2027-08-12",
    featured: false,
  }),
  listing({
    id: "science-hill-covered-parking",
    title: "Covered parking near Science Hill",
    neighborhood: "Science Hill",
    category: "monthly-parking",
    spaceType: "Carport",
    priceCents: 14500,
    priceUnit: "month",
    summary: "One covered sample parking spot near Science Hill for a standard car.",
    description:
      "Sample listing for the Yale demo. The photograph is not a Science Hill address. One carport space for a standard car. Vans, trucks, and oversized vehicles are not part of this sample offer. The driver comes and goes; the space is not storage for boxes. Illustrative monthly price.",
    image: "/images/evening-driveway.jpg",
    imageAlt: "A car under a carport, used as a sample photo",
    capacityLabel: "One standard car, covered",
    capacityCuFtMin: null,
    capacityCuFtMax: null,
    suitableFor: ["One standard car"],
    accessNotes: "Come and go during the listed window. Overnight is included. No guest rotation.",
    restrictions: ["Standard passenger cars only.", "No vans, trucks, or box storage.", "No trailers."],
    accepts: { boxes: false, luggage: false, miniFridge: false, bicycle: false, vehicle: true },
    vehicleLimit: "standard-car",
    availableFrom: "2026-11-17",
    availableUntil: "2027-08-31",
    featured: true,
  }),
  listing({
    id: "downtown-driveway-parking",
    title: "Driveway parking downtown",
    neighborhood: "Downtown New Haven",
    category: "monthly-parking",
    spaceType: "Driveway",
    priceCents: 11000,
    priceUnit: "month",
    summary: "A sample driveway space downtown for one standard car over the summer.",
    description:
      "Sample listing for the Yale demo. The photograph is not a downtown driveway that is actually offered. One tandem-free driveway spot for a standard car. The sample host wants a single parker, not a rotation of visitors. Boxes are not part of this listing.",
    image: "/images/driveway-modern.jpg",
    imageAlt: "A house and driveway used as a sample photo, not a listed address",
    capacityLabel: "One standard car",
    capacityCuFtMin: null,
    capacityCuFtMax: null,
    suitableFor: ["One standard car"],
    accessNotes: "The parker may come and go. Ask before arriving with a second vehicle.",
    restrictions: ["One vehicle.", "No vans or trucks.", "Not a storage unit."],
    accepts: { boxes: false, luggage: false, miniFridge: false, bicycle: false, vehicle: true },
    vehicleLimit: "standard-car",
    availableFrom: "2027-05-01",
    availableUntil: "2027-08-31",
    featured: false,
  }),
  listing({
    id: "east-rock-semester-parking",
    title: "Semester driveway near East Rock",
    neighborhood: "East Rock",
    category: "monthly-parking",
    spaceType: "Driveway",
    priceCents: 9000,
    priceUnit: "month",
    summary: "A sample semester driveway near East Rock for one standard car.",
    description:
      "Sample listing for the Yale demo. The photograph is not the address. One driveway space near East Rock through the spring semester in this sample calendar. Standard cars only. The illustrative price is monthly, not a charge this preview can collect.",
    image: "/images/hero-street.jpg",
    imageAlt: "A car on a residential street, used as a sample photo",
    capacityLabel: "One standard car",
    capacityCuFtMin: null,
    capacityCuFtMax: null,
    suitableFor: ["One standard car"],
    accessNotes: "Come and go. The sample host lives on the property and asks for a quiet arrival.",
    restrictions: ["Standard passenger cars only.", "No overnight guests in a second car.", "No storage."],
    accepts: { boxes: false, luggage: false, miniFridge: false, bicycle: false, vehicle: true },
    vehicleLimit: "standard-car",
    availableFrom: "2027-01-10",
    availableUntil: "2027-05-20",
    featured: false,
  }),
  listing({
    id: "old-campus-weekend-driveway",
    title: "Weekend driveway near Old Campus",
    neighborhood: "Old Campus",
    category: "monthly-parking",
    spaceType: "Driveway",
    priceCents: 8000,
    priceUnit: "event",
    summary: "A sample driveway near Old Campus for one weekend, including overnight, for an SUV or a standard car.",
    description:
      "Sample listing for the Yale demo. The photograph is not an Old Campus address and not a university lot. One off-street driveway for a weekend visit, move-in, or graduation. Overnight parking is included. An SUV or a standard car fits. Box trucks, buses, and trailers do not. The illustrative price is $80 for the weekend, not a charge this preview can collect.",
    image: "/images/driveway-modern.jpg",
    imageAlt: "A house and driveway used as a sample photo, not a listed address",
    capacityLabel: "One SUV or standard car, overnight included",
    capacityCuFtMin: null,
    capacityCuFtMax: null,
    suitableFor: ["One SUV", "One standard car", "Overnight weekend parking"],
    accessNotes: "Overnight is included. Come and go during the booked weekend. The sample host asks for a quiet arrival.",
    restrictions: ["One vehicle.", "SUVs fit. No box trucks, buses, or trailers.", "Not a storage space."],
    accepts: { boxes: false, luggage: false, miniFridge: false, bicycle: false, vehicle: true },
    vehicleLimit: null,
    availableFrom: "2026-11-17",
    availableUntil: "2027-08-31",
    featured: true,
  }),
]

const byId = new Map(yaleListings.map((listing) => [listing.id, listing]))

export function isYaleNeighborhood(value: string): value is YaleNeighborhood {
  return (YALE_NEIGHBORHOODS as readonly string[]).includes(value)
}

export function isYaleListingId(id: string): boolean {
  return byId.has(id)
}

export function getYaleListing(id: string): YaleListing | undefined {
  return byId.get(id)
}

export function yaleCategoryLabel(id: CategoryId): string {
  if (id === "storage") return "Storage"
  if (id === "monthly-parking") return "Parking"
  if (id === "event-parking") return "Event parking"
  return "Space"
}

export const yaleSearchCategories: { id: CategoryId; label: string }[] = [
  { id: "storage", label: "Storage" },
  { id: "monthly-parking", label: "Parking" },
]

export function isYaleSearchCategory(value: string): value is "storage" | "monthly-parking" {
  return value === "storage" || value === "monthly-parking"
}

export type { PriceUnit }
