import { Suspense } from "react"
import { ListingCard } from "@/components/listing-card"
import { SearchForm } from "@/components/search-form"
import { EmptyState, LoadingState } from "@/components/states"
import { formatAvailability } from "@/lib/catalog"
import { describeYaleQuery, filterYaleListings, parseYaleQuery } from "@/lib/yale/search"
import { YALE_NEIGHBORHOODS, yaleListings, yaleSearchCategories, yaleCategoryLabel } from "@/lib/yale/listings"

export const metadata = {
  title: "Find space",
  description: "Sample storage and parking around Yale in New Haven. Prices are illustrative, and this preview does not take payment.",
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  )
}

function SearchFallback() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <LoadingState />
    </div>
  )
}

async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = parseYaleQuery(await searchParams)
  const results = filterYaleListings(yaleListings, query)

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
      <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-md border border-border bg-card p-4 lg:sticky lg:top-24">
          <SearchForm
            query={query}
            id="refine-search"
            place="New Haven"
            categoryOptions={yaleSearchCategories}
            neighborhoodOptions={YALE_NEIGHBORHOODS}
            neighborhoodEmptyLabel="Anywhere around Yale"
          />
        </aside>
        <section aria-labelledby="results-title">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Yale sample catalog</p>
          <h1 id="results-title" className="mt-2 text-4xl tracking-tight">
            {describeYaleQuery(query)}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {results.length} sample {results.length === 1 ? "listing" : "listings"}
          </p>
          {results.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No sample listing matches."
                body="Try a wider set of dates, another neighborhood, or fewer words. These cards are fictional, and nothing is charged."
                actionHref="/search"
                actionLabel="Clear filters"
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2">
              {results.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  categoryText={yaleCategoryLabel(listing.category)}
                  details={`${listing.capacityLabel} · ${formatAvailability(listing)}`}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
