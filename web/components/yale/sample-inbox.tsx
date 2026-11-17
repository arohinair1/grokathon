"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import {
  requestsSnapshot,
  subscribeRequests,
  writeRequests,
  type StoredSampleRequest,
} from "@/components/yale/sample-request"

export function SampleInbox() {
  const raw = useSyncExternalStore(subscribeRequests, requestsSnapshot, () => "[]")
  const requests = parseRequests(raw)

  function update(id: string, status: StoredSampleRequest["status"]) {
    writeRequests(requests.map((request) => (request.id === id ? { ...request, status } : request)))
  }

  if (requests.length === 0) {
    return (
      <p className="mt-8 text-sm leading-6 text-muted-foreground">
        No simulated requests in this browser. Find a sample space, then send a simulated request. Nothing is stored on a server.
      </p>
    )
  }

  return (
    <div className="mt-8 space-y-4">
      {requests.map((request) => (
        <article key={request.id} className="rounded-md border border-border bg-card p-4">
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">{request.status} · simulated</p>
          <h2 className="mt-2 text-2xl tracking-tight">
            <Link href={`/listings/${request.listingId}`} className="hover:underline">
              {request.listingTitle}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.from} to {request.until}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Simulated host inbox, in this browser only. Accepting does not reserve the space and does not collect payment.
          </p>
          {request.status === "pending" ? (
            <div className="mt-4 flex gap-2">
              <Button type="button" className="h-10 rounded-md px-4" onClick={() => update(request.id, "accepted")}>
                Accept in simulation
              </Button>
              <Button type="button" variant="outline" className="h-10 rounded-md px-4" onClick={() => update(request.id, "declined")}>
                Decline in simulation
              </Button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function parseRequests(raw: string): StoredSampleRequest[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRequest)
  } catch {
    return []
  }
}

function isRequest(value: unknown): value is StoredSampleRequest {
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
