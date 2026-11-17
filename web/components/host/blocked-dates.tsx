"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { addBlockedDatesAction, removeBlockedDatesAction, type HostFormState } from "@/lib/host/actions"

const blank: HostFormState = {}

export function BlockedDates({
  listingId,
  blocks,
}: {
  listingId: string
  blocks: { id: string; startsOn: string; endsOn: string }[]
}) {
  const [state, action, pending] = useActionState(addBlockedDatesAction, blank)
  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 className="text-2xl tracking-tight">Unavailable dates</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          These are calendar dates, not a clock time. A blocked day is unavailable for that whole date. This does not create a booking.
        </p>
      </div>
      <ul className="space-y-2">
        {blocks.length === 0 ? <li className="text-sm text-muted-foreground">No dates blocked.</li> : null}
        {blocks.map((block) => (
          <li key={block.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              {block.startsOn} to {block.endsOn}
            </span>
            <form action={removeBlockedDatesAction}>
              <input type="hidden" name="listing_id" value={listingId} />
              <input type="hidden" name="block_id" value={block.id} />
              <button type="submit" className="text-destructive underline-offset-4 hover:underline">
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>
      <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="listing_id" value={listingId} />
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">From</span>
          <input name="starts_on" type="date" required className="field" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Until</span>
          <input name="ends_on" type="date" required className="field" />
        </label>
        <Button type="submit" disabled={pending} className="h-11 rounded-md px-4">
          {pending ? "Saving…" : "Block dates"}
        </Button>
      </form>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-primary">
          {state.message}
        </p>
      ) : null}
    </section>
  )
}
