import { afterEach, describe, expect, it, vi } from "vitest"
import { runSpaceMatch } from "@/lib/spacematch/run"

const demo =
  "I'm going home for the summer and need to store a mini-fridge, two suitcases, and four boxes near Old Campus from May through August. My budget is around $100 per month."

const extracted = {
  need: "storage",
  from: "2027-05-01",
  until: "2027-08-31",
  datesAreExact: false,
  items: [
    { label: "mini-fridge", quantity: 1 },
    { label: "suitcase", quantity: 2 },
    { label: "moving box", quantity: 4 },
  ],
  capacityCuFtMin: 24,
  capacityCuFtMax: 46,
  capacityAssumptions: "Boxes, suitcases, and a mini-fridge are estimates, not measurements.",
  neighborhood: "Old Campus",
  budgetCents: 10000,
  budgetPeriod: "month",
  accessNotes: null,
  vehicleSize: null,
  missing: [],
}

function completion(content: unknown) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("SpaceMatch", () => {
  it("uses the labeled local parser when Grok is not configured", async () => {
    vi.stubEnv("XAI_API_KEY", "")
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const result = await runSpaceMatch({ messages: [demo], capacityOverrideCuFt: null, today: "2026-11-17" })
    expect(result.inference).toBe("local-fallback")
    expect(result.fallbackReason).toBe("unconfigured")
    expect(result.model).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.matches.map((match) => match.listing.id)).toEqual(["old-campus-summer-storage"])
    expect(result.matches[0]?.explanationSource).toBe("template")
  })

  it("keeps Grok rankings inside the filtered catalog", async () => {
    vi.stubEnv("XAI_API_KEY", "test-key")
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body))
        const name = body.response_format.json_schema.name
        if (name === "space_requirements") return completion(extracted)
        return completion({
          summary: "One sample listing fits.",
          rankings: [
            { id: "invented-garage", fit: "strong", explanation: "A made-up garage at 1 Elm Street for $10." },
            {
              id: "old-campus-summer-storage",
              fit: "strong",
              explanation: "This sample closet is in Old Campus and lists enough space for boxes and luggage. The illustrative price is $95, and a mini-fridge still needs the host to confirm the size.",
            },
          ],
        })
      }),
    )
    const result = await runSpaceMatch({ messages: [demo], capacityOverrideCuFt: null, today: "2026-11-17" })
    expect(result.inference).toBe("grok")
    expect(result.model).toBe("grok-4.7")
    expect(result.matches.map((match) => match.listing.id)).toEqual(["old-campus-summer-storage"])
    expect(result.matches[0]?.explanationSource).toBe("grok")
    expect(result.matches[0]?.explanation).not.toContain("Elm Street")
    expect(result.summarySource).toBe("grok")
  })
})
