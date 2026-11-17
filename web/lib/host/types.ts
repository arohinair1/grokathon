export type CollegeOption = {
  id: string
  name: string
  city: string
  stateCode: string
  slug: string
}

export type StateOption = { code: string; name: string }

export type HostPhoto = {
  id: string
  path: string
  alt: string
  sortOrder: number
  isPrimary: boolean
}

export type HostListing = {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  category: string
  spaceType: string
  neighborhood: string
  city: string
  stateCode: string
  price: string
  priceUnit: string
  capacityLabel: string
  availableFrom: string
  availableUntil: string
  datesConfirmed: boolean
  amenities: string
  restrictions: string
  hostLabel: string
  status: "draft" | "published"
  updatedAt: string
  addressLine: string
  accessNotes: string
  collegeId: string
  photos: HostPhoto[]
  blocks: { id: string; startsOn: string; endsOn: string }[]
}

export type DashboardListing = {
  id: string
  slug: string
  title: string
  status: "draft" | "published"
  city: string
  stateCode: string
  neighborhood: string
  priceCents: number
  priceUnit: string
  image: string | null
  imageAlt: string
}

export function photoPreviewSrc(photo: HostPhoto): string {
  if (photo.path.startsWith("/images/") && !photo.path.includes("..")) return photo.path
  return `/listing-photos/${photo.id}`
}
