import Link from "next/link"
import { ListingCard } from "@/components/listing-card"
import { formatAvailability } from "@/lib/catalog"
import { yaleCategoryLabel } from "@/lib/yale/listings"
import { featuredYaleListings } from "@/lib/yale/search"

export function FeaturedListings() {
  const featured = featuredYaleListings()
  return (
    <section className="border-y border-border bg-card" aria-labelledby="featured-title">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Sample listings</p>
            <h2 id="featured-title" className="mt-2 text-4xl tracking-tight md:text-5xl">
              Spaces around New Haven.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Every card is fictional demo inventory. Neighborhoods are approximate. Hosts are not real people, and the prices are illustrative.
            </p>
          </div>
          <Link href="/search" className="text-sm text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
            Browse the sample catalog
          </Link>
        </div>
        <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              categoryText={yaleCategoryLabel(listing.category)}
              details={`${listing.capacityLabel} · ${formatAvailability(listing)}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
