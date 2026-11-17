import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { notFound } from "next/navigation"
import { categoryLabel, formatPrice, type CategoryId, type PriceUnit } from "@/lib/catalog"
import { loadListing, photoPreviewSrc } from "@/lib/host/load"

export const metadata: Metadata = {
  title: "Listing preview",
  robots: { index: false, follow: false },
}

export default async function PreviewListingPage({ params }: { params: Promise<{ id: string }> }) {
  await connection()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const loaded = await loadListing(id)
  if (!loaded.ok && loaded.missing) notFound()
  if (!loaded.ok) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-14">
        <p role="alert">Hosting isn’t available until the database update is applied.</p>
      </div>
    )
  }
  const listing = loaded.listing
  const cover = listing.photos.find((photo) => photo.isPrimary) ?? listing.photos[0]
  return (
    <article className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      <Link href={`/host/listings/${listing.id}/edit`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Back to editing
      </Link>
      <p className="mt-4 text-xs tracking-[0.16em] text-primary uppercase">
        {listing.status === "published" ? "Published preview" : "Draft preview · only you can see this"}
      </p>
      <h1 className="mt-3 text-4xl tracking-tight md:text-5xl">{listing.title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{listing.summary || "No summary yet."}</p>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoPreviewSrc(cover)} alt={cover.alt} className="mt-6 aspect-[16/10] w-full rounded-md object-cover" />
      ) : (
        <div className="mt-6 grid aspect-[16/10] place-items-center rounded-md bg-muted text-sm text-muted-foreground">
          No photo yet
        </div>
      )}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)]">
        <div className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>{listing.description || "No description yet."}</p>
          {listing.amenities ? <p>Amenities: {listing.amenities}</p> : null}
          {listing.restrictions ? <p>Restrictions: {listing.restrictions}</p> : null}
          <div className="rounded-md border border-border bg-card p-4 text-foreground">
            <h2 className="text-xl tracking-tight">Only you see this</h2>
            <p className="mt-2">Street address: {listing.addressLine || "Not added"}</p>
            <p>Access notes: {listing.accessNotes || "None"}</p>
          </div>
        </div>
        <aside className="rounded-md border border-border bg-card p-5">
          <p className="font-display text-3xl tracking-tight">
            {listing.price ? formatPrice(Math.round(Number(listing.price) * 100), listing.priceUnit as PriceUnit) : "Price not set"}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {categoryLabel((listing.category as CategoryId) || "monthly-parking")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[listing.neighborhood, listing.city, listing.stateCode].filter(Boolean).join(", ") || "Location not set"}
          </p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This preview does not take booking requests or payments.
          </p>
        </aside>
      </div>
    </article>
  )
}
