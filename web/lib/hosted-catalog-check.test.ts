import { afterEach, describe, expect, it, vi } from "vitest"
import {
  checkAnonymousWriteDenied,
  checkHostedCatalogRead,
} from "./hosted-catalog-check.mjs"

const slugs = [
  "burns-park-driveway",
  "eberwhite-saturday",
  "kerrytown-garage",
  "old-west-semester",
  "packard-graduation",
  "south-main-carport",
  "stadium-lawn",
  "water-hill-summer",
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("checkHostedCatalogRead", () => {
  it("does not write while checking the published catalog", async () => {
    const methods: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        methods.push(init?.method ?? "GET")
        const url = String(input)
        if (url.includes("status=eq.published")) {
          return Response.json(
            slugs.map((slug) => ({
              slug,
              price_cents: 100,
              available_from: "2026-01-01",
              available_until: "2026-02-01",
              status: "published",
              listing_photos: [{ path: "/images/x.jpg", sort_order: 0 }],
            })),
          )
        }
        return Response.json([])
      }),
    )

    const result = await checkHostedCatalogRead({
      url: "http://db.test",
      anonKey: "anon-key",
    })

    expect(result.ok).toBe(true)
    expect(result.publishedCount).toBe(8)
    expect(result.photoCount).toBe(8)
    expect(result.draftVisible).toBe(false)
    expect(methods.every((method) => method === "GET")).toBe(true)
    expect(result).not.toHaveProperty("writeDenied")
  })
})

describe("checkAnonymousWriteDenied", () => {
  it("treats a permission error as a denied write", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ code: "42501", message: "permission denied" }, { status: 403 }),
      ),
    )
    await expect(
      checkAnonymousWriteDenied({ url: "http://db.test", anonKey: "anon-key" }),
    ).resolves.toMatchObject({ writeDenied: true })
  })
})
