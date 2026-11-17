import Link from "next/link"
import { CancelRequestForm, HostDecisionForms } from "@/components/booking-decision-forms"
import { formatIsoDate, formatPrice } from "@/lib/catalog"
import type { BookingRecord, BookingStatus } from "@/lib/bookings/load"

const statusLabel: Record<BookingStatus, string> = {
  pending: "Requested",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
}

export function BookingList({
  rows,
  mode,
}: {
  rows: BookingRecord[]
  mode: "renter" | "host"
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-10 rounded-md border border-dashed border-border bg-card px-6 py-14 text-center">
        <h2 className="text-2xl tracking-tight">{mode === "host" ? "No requests yet" : "No requests yet"}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {mode === "host"
            ? "When someone asks for dates on a published listing, the request shows up here. Accepting it reserves those dates. It does not collect payment."
            : "Request dates from a published listing. The host can accept or decline. Nothing is charged."}
        </p>
      </div>
    )
  }

  return (
    <ul className="mt-8 space-y-4">
      {rows.map((row) => (
        <li key={row.id} className="rounded-md border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.14em] text-primary uppercase">{statusLabel[row.status]}</p>
              <h2 className="mt-1 text-2xl tracking-tight">
                {row.listingSlug ? (
                  <Link href={`/listings/${row.listingSlug}`} className="underline-offset-4 hover:underline">
                    {row.listingTitle}
                  </Link>
                ) : (
                  row.listingTitle
                )}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatIsoDate(row.startsOn)} – {formatIsoDate(row.endsOn)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPrice(row.priceCents, row.priceUnit)} at the time of the request. Not a charge.
              </p>
              {row.counterparty ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "host" ? "Requested by" : "Host"} {row.counterparty}
                </p>
              ) : null}
              {row.overlapsPending ? (
                <p className="mt-2 text-sm">Another request overlaps these dates. Only one can be accepted.</p>
              ) : null}
            </div>
            {mode === "host" && row.status === "pending" ? <HostDecisionForms requestId={row.id} /> : null}
            {mode === "renter" && row.status === "pending" ? <CancelRequestForm requestId={row.id} /> : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
