"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { HostDraftResult } from "@/lib/spacematch/types"

const STARTER =
  "I have an empty storage closet in my apartment near Broadway. It's about 5 by 6 feet and available from May 15 to August 20. I can provide access on weekends."

export function HostDrafter() {
  const [description, setDescription] = useState(STARTER)
  const [result, setResult] = useState<HostDraftResult | null>(null)
  const [draft, setDraft] = useState<HostDraftResult["draft"] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [approved, setApproved] = useState(false)

  return (
    <div className="space-y-8">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          setApproved(false)
          setLoading(true)
          setError("")
          void fetch("/api/host-draft", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ description }),
          })
            .then(async (response) => {
              const body = (await response.json()) as HostDraftResult & { error?: string }
              if (!response.ok) {
                setError(body.error || "The draft could not be prepared.")
                return
              }
              setResult(body)
              setDraft(body.draft)
            })
            .catch(() => setError("The draft assistant could not be reached."))
            .finally(() => setLoading(false))
        }}
      >
        <label className="block space-y-2 text-sm">
          <span className="text-muted-foreground">Describe a space you are allowed to offer</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={2000} className="field h-auto py-3 leading-6" />
        </label>
        <Button type="submit" disabled={loading} className="h-12 rounded-md px-5">
          {loading ? "Drafting…" : "Draft with Grok"}
        </Button>
      </form>
      {error ? <p role="alert" className="text-sm">{error}</p> : null}
      {result && draft ? (
        <form
          className="space-y-4 rounded-md border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault()
            const saved = {
              ...draft,
              approvedAt: new Date().toISOString(),
              published: false,
            }
            window.localStorage.setItem("college-space-yale-host-draft", JSON.stringify(saved))
            setApproved(true)
          }}
        >
          <p className="text-xs tracking-[0.14em] text-demo uppercase">
            {result.inference === "grok"
              ? `Grok draft (${result.model}). Review every line before you keep it.`
              : "Local draft, not a Grok response. Live inference is unavailable or did not answer."}
          </p>
          <Field label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
          <label className="block text-sm">
            <span className="text-muted-foreground">Description</span>
            <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={4} className="field mt-1 h-auto py-3" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-muted-foreground">Category</span>
              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft({ ...draft, category: event.target.value === "monthly-parking" ? "monthly-parking" : "storage" })
                }
                className="field mt-1"
              >
                <option value="storage">Storage</option>
                <option value="monthly-parking">Parking</option>
              </select>
            </label>
            <Field label="Capacity" value={draft.capacityLabel} onChange={(capacityLabel) => setDraft({ ...draft, capacityLabel })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Available from" value={draft.availableFrom ?? ""} onChange={(availableFrom) => setDraft({ ...draft, availableFrom: availableFrom || null })} />
            <Field label="Available until" value={draft.availableUntil ?? ""} onChange={(availableUntil) => setDraft({ ...draft, availableUntil: availableUntil || null })} />
          </div>
          <Field label="Neighborhood" value={draft.neighborhood ?? ""} onChange={(neighborhood) => setDraft({ ...draft, neighborhood: neighborhood ? (neighborhood as HostDraftResult["draft"]["neighborhood"]) : null })} />
          <Field label="Access" value={draft.accessNotes} onChange={(accessNotes) => setDraft({ ...draft, accessNotes })} />
          {draft.omitted.length > 0 ? (
            <div>
              <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">Left out on purpose</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                {draft.omitted.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button type="submit" className="h-11 rounded-md px-4">
            Approve this draft in the browser
          </Button>
          {approved ? (
            <p role="status" className="text-sm leading-6">
              Saved in this browser only. It is not published, not in the sample catalog, and not a booking.
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="field mt-1" />
    </label>
  )
}
