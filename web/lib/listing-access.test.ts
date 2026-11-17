import { afterEach, describe, expect, it, vi } from "vitest"
import {
  CATALOG_FETCH_TIMEOUT_MS,
  catalogIsReachable,
  listingDecision,
  publishedListingExists,
} from "@/lib/listing-access"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("listingDecision", () => {
  it("uses the checked-in catalog when Supabase is not configured", () => {
    expect(listingDecision("kerrytown-garage", "file")).toBe("allow")
    expect(listingDecision("not-a-listing", "file")).toBe("missing")
    expect(listingDecision("hidden-sample-draft", "file")).toBe("missing")
  })

  it("hides an unpublished slug that is still in the checked-in file", () => {
    expect(listingDecision("stadium-lawn", false)).toBe("missing")
  })

  it("allows a published slug that exists only in the database", () => {
    expect(listingDecision("db-only-garage", true)).toBe("allow")
  })

  it("treats a failed lookup as unavailable rather than missing", () => {
    expect(listingDecision("kerrytown-garage", "unavailable")).toBe("unavailable")
    expect(listingDecision("not-a-listing", "unavailable")).toBe("unavailable")
  })

  it("rejects an empty or unsafe slug", () => {
    expect(listingDecision("", "file")).toBe("missing")
    expect(listingDecision("slug,or", true)).toBe("missing")
    expect(listingDecision("../secret", true)).toBe("missing")
  })
})

describe("publishedListingExists", () => {
  it("reads a published row and treats an empty result as unpublished", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes("slug=eq.db-only-garage")
        ? [{ slug: "db-only-garage" }]
        : []
      return new Response(JSON.stringify(body), { status: 200 })
    })
    vi.stubGlobal("fetch", fetchMock)
    const env = { url: "http://db.test", anonKey: "anon-key" }

    await expect(publishedListingExists("db-only-garage", env)).resolves.toBe(true)
    await expect(publishedListingExists("stadium-lawn", env)).resolves.toBe(false)

    const first = String(fetchMock.mock.calls[0][0])
    expect(first).toContain("/rest/v1/listings")
    expect(first).toContain("status=eq.published")
    expect(first).toContain("listing_photos")
    expect(first).not.toContain("service_role")
  })

  it("asks for a bounded timeout", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })),
    )
    await publishedListingExists("kerrytown-garage", {
      url: "http://db.test",
      anonKey: "anon-key",
    })
    expect(timeout).toHaveBeenCalledWith(CATALOG_FETCH_TIMEOUT_MS)
    timeout.mockRestore()
  })

  it("returns null when the lookup fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 500 })),
    )
    await expect(
      publishedListingExists("kerrytown-garage", {
        url: "http://db.test",
        anonKey: "anon-key",
      }),
    ).resolves.toBeNull()
  })

  it("returns null when the lookup times out", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort())
    vi.stubGlobal(
      "fetch",
      vi.fn((_input, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          return Promise.reject(init.signal.reason ?? new Error("aborted"))
        }
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason ?? new Error("aborted"))
          })
        })
      }),
    )
    await expect(
      publishedListingExists("kerrytown-garage", {
        url: "http://db.test",
        anonKey: "anon-key",
      }),
    ).resolves.toBeNull()
    timeout.mockRestore()
  })
})

describe("catalogIsReachable", () => {
  it("is false when the catalog request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 500 })),
    )
    await expect(
      catalogIsReachable({ url: "http://db.test", anonKey: "anon-key" }),
    ).resolves.toBe(false)
  })

  it("asks for the same columns the pages render", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    await catalogIsReachable({ url: "http://db.test", anonKey: "anon-key" })
    const firstCall = fetchMock.mock.calls[0] as unknown[] | undefined
    const url = String(firstCall?.[0])
    expect(url).toContain("listing_photos")
    expect(url).toContain("sample_host_label")
    expect(url).toContain("limit=1")
  })

  it("treats an empty published catalog as reachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })),
    )
    await expect(
      catalogIsReachable({ url: "http://db.test", anonKey: "anon-key" }),
    ).resolves.toBe(true)
  })
})
