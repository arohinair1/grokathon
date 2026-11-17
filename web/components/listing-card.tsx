import Image from "next/image"
import Link from "next/link"
import { DemoBadge } from "@/components/demo-badge"
import {
  categoryLabel,
  formatPrice,
  type Listing,
} from "@/lib/catalog"

export function ListingCard({
  listing,
  categoryText,
  details,
}: {
  listing: Listing
  categoryText?: string
  details?: string
}) {
  return (
    <article className="group h-full">
      <Link href={`/listings/${listing.id}`} className="flex h-full flex-col">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
          <Image
            src={listing.image}
            alt={listing.imageAlt}
            fill
            unoptimized={!listing.image.startsWith("/images/")}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
          />
          {listing.demo ? <DemoBadge className="absolute top-3 left-3" /> : null}
        </div>
        <div className="flex flex-1 flex-col pt-3">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {listing.neighborhood}
            <span aria-hidden="true"> · </span>
            {listing.spaceType}
          </p>
          <h3 className="mt-1 text-[1.35rem] leading-tight text-foreground group-hover:underline group-hover:decoration-border group-hover:underline-offset-4">
            {listing.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {listing.summary}
          </p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <p className="font-display text-lg tracking-tight text-foreground">
              {formatPrice(listing.priceCents, listing.priceUnit)}
            </p>
            <p className="max-w-[11rem] text-right text-xs leading-5 text-muted-foreground">
              {categoryText ?? categoryLabel(listing.category)}
            </p>
          </div>
          {details ? <p className="pt-2 text-xs leading-5 text-muted-foreground">{details}</p> : null}
        </div>
      </Link>
    </article>
  )
}
