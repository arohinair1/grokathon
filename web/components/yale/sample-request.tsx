"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createSampleRequest, validateSampleDates } from "@/lib/yale/sample-booking"

const STORAGE_KEY = "college-space-yale-sample-requests"
const STORAGE_EVENT = "college-space-yale-requests"

export function SampleRequestForm({
  listingId,
  listingTitle,
  availableFrom,
  availableUntil,
  initialFrom = "",
  initialUntil = "",
}: {
  listingId: string
  listingTitle: string
  availableFrom: string
  availableUntil: string
  initialFrom?: string
  initialUntil?: string
}) {
  const router = useRouter()
  const [from, setFrom] = useState(initialFrom || availableFrom)
  const [until, setUntil] = useState(initialUntil || availableUntil)
  const [error, setError] = useState("")

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        const problem = validateSampleDates(availableFrom, availableUntil, from, until)
        if (problem) {
          setError(problem)
          return
        }
        const request = createSampleRequest({ listingId, listingTitle, from, until })
        const existing = readRequests().filter((item) => item.id !== request.id)
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([request, ...existing]))
        router.push("/bookings?simulated=1")
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-muted-foreground">From</span>
          <input type="date" value={from} min={availableFrom} max={availableUntil} onChange={(event) => setFrom(event.target.value)} className="field mt-1" required />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Until</span>
          <input type="date" value={until} min={availableFrom} max={availableUntil} onChange={(event) => setUntil(event.target.value)} className="field mt-1" required />
        </label>
      </div>
      {error ? <p role="alert" className="text-sm">{error}</p> : null}
      <Button type="submit" className="h-11 w-full rounded-md">
        Send a simulated request
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        This stays in this browser. It is not sent to a host, does not hold the space, and does not collect payment.
      </p>
    </form>
  )
}

export type StoredSampleRequest = ReturnType<typeof createSampleRequest>

export function readRequests(): StoredSampleRequest[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isStored)
  } catch {
    return []
  }
}

function isStored(value: unknown): value is StoredSampleRequest {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === "string" &&
    typeof record.listingId === "string" &&
    typeof record.listingTitle === "string" &&
    typeof record.from === "string" &&
    typeof record.until === "string" &&
    (record.status === "pending" || record.status === "accepted" || record.status === "declined")
  )
}

export function writeRequests(requests: StoredSampleRequest[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
  window.dispatchEvent(new Event(STORAGE_EVENT))
}

export function subscribeRequests(callback: () => void) {
  window.addEventListener(STORAGE_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(STORAGE_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

export function requestsSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) ?? "[]"
}
