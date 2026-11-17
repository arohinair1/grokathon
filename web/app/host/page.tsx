import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { buttonVariants } from "@/components/ui/button"
import { formatPrice, type PriceUnit } from "@/lib/catalog"
import { loadDashboard } from "@/lib/host/load"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Your listings",
  robots: { index: false, follow: false },
}

export default async function HostPage() {
  await connection()
  const dashboard = await loadDashboard()
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 md:px-8 md:py-20">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">Hosting</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl leading-tight md:text-5xl">Your listings</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            The Yale demo starts with a sentence on{" "}
            <Link href="/list" className="underline-offset-4 hover:underline">
              List your space
            </Link>
            . That draft stays in this browser. Payments are not part of this preview.
          </p>
        </div>
        <Link href="/list" className={cn(buttonVariants(), "h-11 rounded-md px-4")}>
          Draft with Grok
        </Link>
      </div>
      {!dashboard.ok ? (
        <p role="alert" className="mt-8 text-sm">
          Hosting isn’t available until the database update is applied.
        </p>
      ) : dashboard.listings.length === 0 ? (
        <div className="mt-10 rounded-md border border-dashed border-border bg-card px-6 py-14 text-center">
          <h2 className="text-2xl tracking-tight">No listings yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Start with a title. You can leave the price, photos, and dates for later, and nothing is public until you publish.
          </p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dashboard.listings.map((listing) => (
            <li key={listing.id} className="overflow-hidden rounded-md border border-border bg-card">
              <div className="relative aspect-[4/3] bg-muted">
                {listing.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.image} alt={listing.imageAlt} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="space-y-3 p-4">
                <p className="text-xs tracking-[0.14em] text-primary uppercase">
                  {listing.status === "published" ? "Published" : "Draft"}
                </p>
                <h2 className="text-2xl leading-tight">{listing.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {[listing.neighborhood, listing.city, listing.stateCode].filter(Boolean).join(", ") || "Location not set"}
                </p>
                <p className="font-display text-lg">
                  {listing.priceCents > 0 ? formatPrice(listing.priceCents, listing.priceUnit as PriceUnit) : "Price not set"}
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <Link href={`/host/listings/${listing.id}/edit`} className="underline-offset-4 hover:underline">
                    Edit
                  </Link>
                  <Link href={`/host/listings/${listing.id}/preview`} className="underline-offset-4 hover:underline">
                    Preview
                  </Link>
                  {listing.status === "published" ? (
                    <Link href={`/listings/${listing.slug}`} className="underline-offset-4 hover:underline">
                      Public page
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
