"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { marketLabel } from "@/lib/directory"

type Hit = {
  slug: string
  name: string
  city: string
  stateName: string
  marketStatus: string
}

export function CollegeSearch({ id = "college-search" }: { id?: string }) {
  const router = useRouter()
  const listId = useId()
  const [term, setTerm] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [message, setMessage] = useState("")
  const request = useRef(0)

  const cleaned = term.trim()

  useEffect(() => {
    if (cleaned.length < 2) return
    const current = request.current + 1
    request.current = current
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/colleges?q=${encodeURIComponent(cleaned)}`)
        if (request.current !== current) return
        if (!response.ok) {
          setHits([])
          setMessage("College search is unavailable.")
          setOpen(true)
          return
        }
        const body = (await response.json()) as { colleges?: Hit[] }
        if (request.current !== current) return
        const colleges = body.colleges ?? []
        setHits(colleges)
        setActive(0)
        setMessage(colleges.length === 0 ? "No colleges match that name." : "")
        setOpen(true)
      } catch {
        if (request.current !== current) return
        setHits([])
        setMessage("College search is unavailable.")
        setOpen(true)
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [cleaned])

  function choose(hit: Hit) {
    setOpen(false)
    router.push(`/colleges/${hit.slug}`)
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        Find your college
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && hits[active] ? `${listId}-${active}` : undefined}
        value={term}
        placeholder="College name"
        autoComplete="off"
        className="field mt-1.5"
        onChange={(event) => {
          setTerm(event.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (term.trim().length >= 2) setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setActive((index) => Math.min(index + 1, Math.max(hits.length - 1, 0)))
          } else if (event.key === "ArrowUp") {
            event.preventDefault()
            setActive((index) => Math.max(index - 1, 0))
          } else if (event.key === "Enter" && open && hits[active]) {
            event.preventDefault()
            choose(hits[active])
          } else if (event.key === "Escape") {
            setOpen(false)
          }
        }}
      />
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
        A college in the directory is not an open marketplace unless it says Open.
      </p>
      {open && cleaned.length >= 2 ? (
        <ul id={listId} role="listbox" className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-md border border-border bg-card p-1 shadow-sm">
          {(cleaned.length < 2 ? [] : hits).map((hit, index) => (
            <li key={hit.slug} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={`flex w-full items-start justify-between gap-3 rounded-sm px-3 py-2 text-left ${index === active ? "bg-secondary" : ""}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(hit)}
              >
                <span>
                  <span className="block text-sm">{hit.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {hit.city}, {hit.stateName}
                  </span>
                </span>
                <span className="shrink-0 text-xs tracking-wide text-primary uppercase">{marketLabel(hit.marketStatus)}</span>
              </button>
            </li>
          ))}
          {message ? <li className="px-3 py-2 text-sm text-muted-foreground">{message}</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
