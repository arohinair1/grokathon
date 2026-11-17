import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { notFound } from "next/navigation"
import { BlockedDates } from "@/components/host/blocked-dates"
import { ListingForm } from "@/components/host/listing-form"
import { PhotoManager } from "@/components/host/photo-manager"
import { PublishBar } from "@/components/host/publish-bar"
import { deleteDraftAction } from "@/lib/host/actions"
import { loadDirectory, loadListing } from "@/lib/host/load"

export const metadata: Metadata = {
  title: "Edit listing",
  robots: { index: false, follow: false },
}

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const { id } = await params
  const query = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [directory, loaded] = await Promise.all([loadDirectory(), loadListing(id)])
  if (!loaded.ok && loaded.missing) notFound()
  if (!loaded.ok || !directory.ok) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-14">
        <p role="alert">Hosting isn’t available until the database update is applied.</p>
      </div>
    )
  }
  const { listing } = loaded
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14 md:py-20">
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <Link href="/host" className="underline-offset-4 hover:underline">
          Your listings
        </Link>
        <Link href={`/host/listings/${listing.id}/preview`} className="underline-offset-4 hover:underline">
          Preview
        </Link>
      </div>
      <p className="mt-6 text-xs tracking-[0.18em] text-primary uppercase">Hosting</p>
      <h1 className="mt-3 text-4xl leading-tight">Edit listing</h1>
      {query.notice === "requests" ? (
        <p role="alert" className="mt-4 text-sm">
          This draft has a booking request, so it can’t be deleted.
        </p>
      ) : null}
      <div className="mt-8 space-y-8">
        <PublishBar listingId={listing.id} status={listing.status} />
        <ListingForm listing={listing} colleges={directory.colleges} states={directory.states} />
        <PhotoManager listingId={listing.id} photos={listing.photos} />
        <BlockedDates listingId={listing.id} blocks={listing.blocks} />
        {listing.status === "draft" ? (
          <form action={deleteDraftAction}>
            <input type="hidden" name="listing_id" value={listing.id} />
            <button type="submit" className="text-sm text-destructive underline-offset-4 hover:underline">
              Delete this draft
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
