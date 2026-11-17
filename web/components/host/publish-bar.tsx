"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { publishListingAction, unpublishListingAction, type HostFormState } from "@/lib/host/actions"

const blank: HostFormState = {}

export function PublishBar({ listingId, status }: { listingId: string; status: "draft" | "published" }) {
  const [publishState, publish, publishing] = useActionState(publishListingAction, blank)
  const [hideState, hide, hiding] = useActionState(unpublishListingAction, blank)
  const state = publishState.error || publishState.message ? publishState : hideState
  return (
    <section className="space-y-3 rounded-md border border-border bg-card p-5 sm:p-6">
      <h2 className="text-2xl tracking-tight">{status === "published" ? "Published" : "Draft"}</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        Publishing uses the last saved version and checks the open college market, address, dates, price, and at least one photo. Unpublishing hides it from search without deleting it.
      </p>
      <div className="flex flex-wrap gap-3">
        <form action={publish}>
          <input type="hidden" name="listing_id" value={listingId} />
          <Button type="submit" disabled={publishing} className="h-11 rounded-md px-4">
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </form>
        {status === "published" ? (
          <form action={hide}>
            <input type="hidden" name="listing_id" value={listingId} />
            <Button type="submit" disabled={hiding} variant="outline" className="h-11 rounded-md px-4">
              {hiding ? "Updating…" : "Unpublish"}
            </Button>
          </form>
        ) : null}
      </div>
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
