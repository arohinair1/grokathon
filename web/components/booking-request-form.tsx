"use client"

import { useActionState, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { priceGuidance, todayInAnnArbor } from "@/lib/bookings/pricing"
import { requestBookingAction, type BookingFormState } from "@/lib/bookings/actions"
import type { PriceUnit } from "@/lib/catalog"
import { formatIsoDate } from "@/lib/catalog"

const initial: BookingFormState = {}

export function BookingRequestForm({
  slug,
  priceCents,
  priceUnit,
  availableFrom,
  availableUntil,
  blocked,
  reserved,
}: {
  slug: string
  priceCents: number
  priceUnit: PriceUnit
  availableFrom: string
  availableUntil: string
  blocked: { startsOn: string; endsOn: string }[]
  reserved: { startsOn: string; endsOn: string }[]
}) {
  const [state, action, pending] = useActionState(requestBookingAction, initial)
  const earliest = availableFrom > todayInAnnArbor() ? availableFrom : todayInAnnArbor()
  const [startsOn, setStartsOn] = useState(earliest)
  const [endsOn, setEndsOn] = useState(earliest)
  const guidance = useMemo(
    () => priceGuidance(priceCents, priceUnit, startsOn, endsOn),
    [priceCents, priceUnit, startsOn, endsOn],
  )
  const unavailable = [...reserved.map((span) => ({ ...span, label: "Accepted" })), ...blocked.map((span) => ({ ...span, label: "Blocked" }))]

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="listing_slug" value={slug} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Arrive</span>
          <input
            className="field"
            type="date"
            name="starts_on"
            required
            min={earliest}
            max={availableUntil}
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Leave</span>
          <input
            className="field"
            type="date"
            name="ends_on"
            required
            min={earliest}
            max={availableUntil}
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
          />
        </label>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{guidance.text}</p>
      {unavailable.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {unavailable.map((span) => (
            <li key={`${span.label}-${span.startsOn}-${span.endsOn}`}>
              {span.label}: {formatIsoDate(span.startsOn)} – {formatIsoDate(span.endsOn)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No accepted reservations or blocked dates are listed yet.</p>
      )}
      {state.error ? (
        <p role="alert" className="text-sm">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full rounded-md" disabled={pending}>
        {pending ? "Sending request…" : "Request these dates"}
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        This is a request until the host accepts it. Acceptance does not collect payment.
      </p>
    </form>
  )
}
