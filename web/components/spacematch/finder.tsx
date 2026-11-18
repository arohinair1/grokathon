"use client"

import Link from "next/link"
import { useState } from "react"
import { DemoBadge } from "@/components/demo-badge"
import { Button } from "@/components/ui/button"
import type { SpaceMatchResult } from "@/lib/spacematch/types"

const EXAMPLES = [
  "I'm going home for the summer and need to store a mini-fridge, two suitcases, and four boxes near Old Campus for under $100 a month.",
  "My parents are visiting Yale and need a driveway spot near Old Campus for a weekend. They have an SUV and want to spend under $100 total.",
  "I need a parking spot for a regular car near Science Hill from January through May. About $150 a month.",
]

export function SpaceMatchFinder() {
  const [draft, setDraft] = useState(EXAMPLES[0])
  const [followUp, setFollowUp] = useState("")
  const [messages, setMessages] = useState<string[]>([])
  const [capacity, setCapacity] = useState("")
  const [result, setResult] = useState<SpaceMatchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function ask(nextMessages: string[], override: number | null) {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/spacematch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((content) => ({ role: "user", content })),
          capacityOverrideCuFt: override,
        }),
      })
      const body = (await response.json()) as SpaceMatchResult & { error?: string }
      if (!response.ok) {
        setError(body.error || "SpaceMatch could not read that request.")
        return
      }
      setMessages(nextMessages)
      setResult(body)
      if (override === null) {
        setCapacity(body.requirements.capacityCuFtMax ? String(body.requirements.capacityCuFtMax) : "")
      }
    } catch {
      setError("SpaceMatch could not be reached.")
    } finally {
      setLoading(false)
    }
  }

  function overrideValue(): number | null {
    if (!capacity.trim()) return null
    const value = Number(capacity)
    return Number.isInteger(value) ? value : null
  }

  return (
    <div className="space-y-8">
      <form
        className="space-y-4 rounded-md border border-border bg-card p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault()
          const text = draft.trim()
          if (text.length < 2) return
          void ask([text], null)
        }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl tracking-tight">Tell Grok what you need</h2>
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">New Haven</p>
        </div>
        <label className="block space-y-2 text-sm">
          <span className="text-muted-foreground">Your situation</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={5}
            maxLength={2000}
            className="field h-auto py-3 leading-6"
            placeholder="What are you storing or parking, where, and for which dates?"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example.slice(0, 24)}
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-left text-xs leading-5 text-muted-foreground hover:text-foreground"
              onClick={() => setDraft(example)}
            >
              {example.slice(0, 72)}…
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" disabled={loading} className="h-12 rounded-md px-5 text-[15px]">
            {loading && messages.length === 0 ? "Reading your request…" : "Find my space with Grok"}
          </Button>
          <p className="max-w-sm text-xs leading-5 text-muted-foreground">
            Estimates and explanations are labeled. Sample listings stay sample listings. Nothing is charged.
          </p>
        </div>
      </form>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-card px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Reading the request and checking the Yale sample catalog.
        </p>
      ) : null}

      {result ? (
        <div className="space-y-8">
          <InferenceNote result={result} />
          <RequirementSummary
            result={result}
            capacity={capacity}
            onCapacity={setCapacity}
            onApply={() => {
              const value = overrideValue()
              if (messages.length === 0 || value === null) return
              void ask(messages, value)
            }}
            applying={loading}
          />
          <section aria-labelledby="match-title" className="space-y-4">
            <div>
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Sample matches</p>
              <h2 id="match-title" className="mt-2 text-3xl tracking-tight">
                {result.summary}
              </h2>
              {result.summarySource === "grok" ? (
                <p className="mt-2 text-xs tracking-[0.12em] text-demo uppercase">Grok wrote this summary from the filtered listings</p>
              ) : null}
            </div>
            {result.matches.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-card px-5 py-8">
                <p className="text-sm leading-6 text-muted-foreground">
                  No sample listing satisfies every confirmed constraint. Grok cannot add a listing that is not in the catalog.
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-6">
                  {result.suggestions.map((suggestion) => (
                    <li key={suggestion.constraint}>{suggestion.note}</li>
                  ))}
                </ul>
                {result.misses.length > 0 ? (
                  <div className="mt-6 space-y-3">
                    <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">Closest sample listings, not matches</p>
                    {result.misses.map((miss) => (
                      <p key={miss.listing.id} className="text-sm leading-6">
                        <Link href={`/listings/${miss.listing.id}`} className="underline underline-offset-4">
                          {miss.listing.title}
                        </Link>
                        . {miss.reasons.join(" ")}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-6">
                {result.matches.map((match) => (
                  <article key={match.listing.id} className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
                    <div
                      className="h-36 rounded-md bg-cover bg-center sm:h-full"
                      style={{ backgroundImage: `url(${match.listing.image})` }}
                      role="img"
                      aria-label={match.listing.imageAlt}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <DemoBadge />
                        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                          {match.fit} fit · {match.listing.neighborhood}
                        </p>
                      </div>
                      <h3 className="mt-2 text-2xl tracking-tight">
                        <Link href={listingHref(match.listing.id, result)} className="hover:underline">
                          {match.listing.title}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {match.listing.capacityLabel}
                        <span aria-hidden="true"> · </span>
                        {match.listing.priceLabel} illustrative
                        <span aria-hidden="true"> · </span>
                        {match.listing.availability}
                      </p>
                      <p className="mt-3 text-sm leading-6">{match.explanation}</p>
                      <p className="mt-2 text-xs tracking-[0.12em] text-demo uppercase">
                        {match.explanationSource === "grok" ? "Grok explanation, checked against the listing" : "Explanation written from the listing facts"}
                      </p>
                      <Link
                        href={listingHref(match.listing.id, result)}
                        className="mt-4 inline-flex text-sm underline underline-offset-4"
                      >
                        Open this sample listing
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <form
            className="space-y-3 rounded-md border border-border bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault()
              const text = followUp.trim()
              if (text.length < 2 || messages.length === 0) return
              setFollowUp("")
              void ask([...messages, text], overrideValue())
            }}
          >
            <label className="block space-y-2 text-sm">
              <span className="text-muted-foreground">Refine the request</span>
              <input
                value={followUp}
                onChange={(event) => setFollowUp(event.target.value)}
                className="field"
                placeholder="Only show options under $80"
                maxLength={2000}
              />
            </label>
            <Button type="submit" variant="outline" disabled={loading || messages.length === 0} className="h-10 rounded-md px-4">
              Update matches
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function listingHref(id: string, result: SpaceMatchResult): string {
  const params = new URLSearchParams()
  if (result.requirements.from) params.set("from", result.requirements.from)
  if (result.requirements.until) params.set("until", result.requirements.until)
  const query = params.toString()
  return query ? `/listings/${id}?${query}` : `/listings/${id}`
}

function InferenceNote({ result }: { result: SpaceMatchResult }) {
  if (result.inference === "grok") {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Grok ({result.model}) read this request. College Space then filtered the Yale sample catalog. Grok did not create these listings.
      </p>
    )
  }
  const reason =
    result.fallbackReason === "unconfigured"
      ? "Live Grok inference is not configured in this environment."
      : result.fallbackReason === "limited"
        ? "This preview has paused live Grok calls for now."
        : "Grok did not return a usable answer."
  return (
    <p role="status" className="rounded-md border border-demo/30 bg-card px-4 py-3 text-sm leading-6">
      {reason} The reading below is a labeled local parser, not a Grok response.
    </p>
  )
}

function RequirementSummary({
  result,
  capacity,
  onCapacity,
  onApply,
  applying,
}: {
  result: SpaceMatchResult
  capacity: string
  onCapacity: (value: string) => void
  onApply: () => void
  applying: boolean
}) {
  const { requirements } = result
  const items =
    requirements.items.length === 0
      ? "None confirmed"
      : requirements.items.map((item) => (item.quantity ? `${item.quantity} ${item.label}` : item.label)).join(", ")
  return (
    <section aria-labelledby="understood-title" className="rounded-md border border-border bg-card p-5">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">What was understood</p>
      <h2 id="understood-title" className="mt-2 text-3xl tracking-tight">Requirements</h2>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <Fact term="Need" detail={requirements.need === "either" ? "Storage or parking" : requirements.need} />
        <Fact
          term="Dates"
          detail={
            requirements.from && requirements.until
              ? `${requirements.from} to ${requirements.until}${requirements.datesAreExact ? "" : " (interpreted, not an exact move-out date)"}`
              : "Not confirmed"
          }
        />
        <Fact term="Belongings" detail={items} />
        <Fact term="Neighborhood" detail={requirements.neighborhood ?? "Not specified"} />
        <Fact
          term="Budget"
          detail={
            requirements.budgetCents
              ? `$${(requirements.budgetCents / 100).toFixed(0)} / ${requirements.budgetPeriod ?? "month"}, if the listing uses that unit`
              : "Not confirmed"
          }
        />
        <Fact term="Access" detail={requirements.accessNotes ?? "Not specified"} />
      </dl>
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs tracking-[0.14em] text-demo uppercase">
          {result.inference === "grok" ? "Grok capacity estimate" : "Local capacity estimate"}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {requirements.capacityCuFtMin && requirements.capacityCuFtMax
            ? `${requirements.capacityCuFtMin}–${requirements.capacityCuFtMax} cubic feet. ${requirements.capacityAssumptions}`
            : requirements.capacityAssumptions || "No capacity estimate."}
        </p>
        {requirements.capacityCuFtMax ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-sm">
            <span className="text-muted-foreground">Adjust the estimate (cubic feet)</span>
            <input
              inputMode="numeric"
              value={capacity}
              onChange={(event) => onCapacity(event.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              className="field mt-1"
            />
          </label>
          <Button type="button" variant="outline" className="h-12 rounded-md px-4" disabled={applying} onClick={onApply}>
            Use this estimate
          </Button>
        </div>
        ) : null}
      </div>
      {requirements.missing.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {requirements.missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function Fact({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">{term}</dt>
      <dd className="mt-1 leading-6">{detail}</dd>
    </div>
  )
}
