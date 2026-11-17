"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import {
  acceptBookingAction,
  cancelBookingAction,
  declineBookingAction,
  type BookingFormState,
} from "@/lib/bookings/actions"

const initial: BookingFormState = {}

function DecisionForm({
  requestId,
  action,
  label,
  pendingLabel,
  variant,
}: {
  requestId: string
  action: (state: BookingFormState, formData: FormData) => Promise<BookingFormState>
  label: string
  pendingLabel: string
  variant: "default" | "outline"
}) {
  const [state, formAction, pending] = useActionState(action, initial)
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="request_id" value={requestId} />
      <Button type="submit" variant={variant} className="h-10 rounded-md px-3" disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-primary">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

export function HostDecisionForms({ requestId }: { requestId: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <DecisionForm
        requestId={requestId}
        action={acceptBookingAction}
        label="Accept"
        pendingLabel="Accepting…"
        variant="default"
      />
      <DecisionForm
        requestId={requestId}
        action={declineBookingAction}
        label="Decline"
        pendingLabel="Declining…"
        variant="outline"
      />
    </div>
  )
}

export function CancelRequestForm({ requestId }: { requestId: string }) {
  return (
    <DecisionForm
      requestId={requestId}
      action={cancelBookingAction}
      label="Cancel request"
      pendingLabel="Cancelling…"
      variant="outline"
    />
  )
}
