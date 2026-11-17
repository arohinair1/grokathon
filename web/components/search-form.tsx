import { Button } from "@/components/ui/button"
import { YALE_NEIGHBORHOODS, yaleSearchCategories } from "@/lib/yale/listings"

type SearchFields = {
  category?: string
  neighborhood?: string
  from?: string
  until?: string
  q?: string
}

export function SearchForm({
  query,
  id = "space-search",
  action = "/search",
  place = "New Haven",
  showNeighborhoods = true,
  categoryOptions = yaleSearchCategories,
  neighborhoodOptions = YALE_NEIGHBORHOODS,
  neighborhoodEmptyLabel = "Anywhere around Yale",
  note = "Dates have to fit inside a sample listing’s window. A simulated request does not hold the space or collect payment.",
}: {
  query?: SearchFields
  id?: string
  action?: string
  place?: string
  showNeighborhoods?: boolean
  categoryOptions?: readonly { id: string; label: string }[]
  neighborhoodOptions?: readonly string[]
  neighborhoodEmptyLabel?: string
  note?: string
}) {
  return (
    <form action={action} className="@container space-y-4" aria-labelledby={`${id}-title`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="font-display text-xl tracking-tight">
          Find a space
        </h2>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{place}</p>
      </div>
      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Words</span>
        <input
          type="search"
          name="q"
          defaultValue={query?.q ?? ""}
          placeholder="Closet, driveway, summer"
          maxLength={80}
          className="field"
        />
      </label>
      <div className="grid gap-3 @md:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Category</span>
          <select name="category" defaultValue={query?.category ?? ""} className="field">
            <option value="">All spaces</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        {showNeighborhoods ? (
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Neighborhood</span>
            <select name="neighborhood" defaultValue={query?.neighborhood ?? ""} className="field">
              <option value="">{neighborhoodEmptyLabel}</option>
              {neighborhoodOptions.map((neighborhood) => (
                <option key={neighborhood} value={neighborhood}>
                  {neighborhood}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">From</span>
          <input type="date" name="from" defaultValue={query?.from ?? ""} className="field" />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Until</span>
          <input type="date" name="until" defaultValue={query?.until ?? ""} className="field" />
        </label>
      </div>
      <div className="flex flex-col gap-3 @md:flex-row @md:items-center @md:justify-between">
        <Button type="submit" className="h-12 w-full rounded-md px-5 text-[15px] @md:w-auto @md:min-w-40">
          Search spaces
        </Button>
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">{note}</p>
      </div>
    </form>
  )
}
