import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DemoBadge } from "@/components/demo-badge"
import { SampleRequestForm } from "@/components/yale/sample-request"
import { formatAvailability, formatPrice, isIsoDate } from "@/lib/catalog"
import { getYaleListing, yaleCategoryLabel, yaleListings } from "@/lib/yale/listings"

export function generateStaticParams() {
  return yaleListings.map((listing) => ({ id: listing.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = getYaleListing(id)
  if (!listing) return { title: "Listing not found" }
  return { title: listing.title, description: listing.summary }
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const listing = getYaleListing(id)
  if (!listing) notFound()
  const raw = await searchParams
  const from = typeof raw.from === "string" && isIsoDate(raw.from) ? raw.from : ""
  const until = typeof raw.until === "string" && isIsoDate(raw.until) ? raw.until : ""

  return (
    <article className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      <Link href="/search" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        All sample spaces
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <DemoBadge />
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
          {listing.neighborhood}, New Haven
        </p>
      </div>
      <div className="mt-3 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)] lg:items-start">
        <div>
          <h1 className="text-4xl tracking-tight md:text-5xl">{listing.title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{listing.summary}</p>
          <div className="relative mt-6 aspect-[16/10] overflow-hidden rounded-md bg-muted">
            <Image
              src={listing.image}
              alt={listing.imageAlt}
              fill
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Sample photograph. Not a New Haven address and not this space.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <Fact label="Category" value={yaleCategoryLabel(listing.category)} />
            <Fact label="Space" value={listing.spaceType} />
            <Fact label="Capacity" value={listing.capacityLabel} />
          </div>
          <h2 className="mt-10 text-2xl tracking-tight">About this sample</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{listing.description}</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <Fact label="Suitable for" value={listing.suitableFor.join(", ")} />
            <Fact label="Access" value={listing.accessNotes} />
            <Fact label="Limits" value={listing.restrictions.join(" ")} />
            <Fact label="Availability" value={formatAvailability(listing)} />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Sample host, not a real person. The price {formatPrice(listing.priceCents, listing.priceUnit)} is illustrative.
          </p>
        </div>
        <aside className="rounded-md border border-border bg-card p-5 lg:sticky lg:top-24">
          <p className="font-display text-3xl tracking-tight">{formatPrice(listing.priceCents, listing.priceUnit)}</p>
          <p className="mt-1 text-sm text-demo">Illustrative sample price. No payment.</p>
          <p className="mt-2 text-sm text-muted-foreground">{formatAvailability(listing)}</p>
          <div className="mt-5 border-t border-border pt-5">
            <h2 className="text-xl tracking-tight">Simulated request</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This listing is fictional. The request below is a demonstration of the next step.
            </p>
            <SampleRequestForm
              listingId={listing.id}
              listingTitle={listing.title}
              availableFrom={listing.availableFrom}
              availableUntil={listing.availableUntil}
              initialFrom={from}
              initialUntil={until}
            />
          </div>
        </aside>
      </div>
    </article>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-3">
      <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm leading-6 text-foreground">{value}</p>
    </div>
  )
}
