import { createServer, type RequestListener } from "node:http"
import { afterEach, describe, expect, it } from "vitest"
import { CatalogUnavailable, getPublishedListing, mapCatalogRows, mapListingRow, searchListings } from "./repository"

describe("mapListingRow", () => {
  it("uses the primary photo and keeps prices in cents", () => {
    const listing = mapListingRow({
      slug: "kerrytown-garage",
      title: "Lockable garage near Kerrytown",
      summary: "A garage.",
      description: "Demo.",
      category: "storage",
      space_type: "Garage",
      neighborhood: "Kerrytown",
      city: "Ann Arbor",
      state: "MI",
      price_cents: 11000,
      price_unit: "month",
      capacity_label: "Stored gear",
      available_from: "2026-05-01",
      available_until: "2026-08-20",
      featured: true,
      is_demo: true,
      sample_host_label: "Marcus L.",
      listing_photos: [
        { path: "/images/second.jpg", alt: "Second", sort_order: 2, is_primary: false },
        { path: "/images/garage-workshop.jpg", alt: "Garage", sort_order: 0, is_primary: true },
      ],
    })

    expect(listing.id).toBe("kerrytown-garage")
    expect(listing.image).toBe("/images/garage-workshop.jpg")
    expect(listing.priceCents).toBe(11000)
    expect(listing.demo).toBe(true)
    expect(listing.city).toBe("Ann Arbor")
  })

  it("maps a host listing without exposing the storage path", () => {
    const listing = mapListingRow({
      slug: "real-looking",
      title: "x",
      summary: "x",
      description: "x",
      category: "storage",
      space_type: "Garage",
      neighborhood: "Kerrytown",
      city: "Ann Arbor",
      state: "MI",
      price_cents: 1,
      price_unit: "month",
      capacity_label: "x",
      available_from: "2026-05-01",
      available_until: "2026-08-20",
      featured: false,
      is_demo: false,
      sample_host_label: "Host",
      listing_photos: [
        {
          id: "a0000000-0000-4000-8000-000000000001",
          path: "listing/photo.jpg",
          alt: "Garage",
          sort_order: 0,
          is_primary: true,
        },
      ],
    })
    expect(listing.demo).toBe(false)
    expect(listing.image).toBe("/listing-photos/a0000000-0000-4000-8000-000000000001")
    expect(listing.image).not.toContain("listing/photo")
  })

  it("skips a published row with no photo instead of failing the rest", () => {
    const rows = mapCatalogRows([
      {
        slug: "kept",
        title: "Kept",
        summary: "A garage.",
        description: "Demo.",
        category: "storage",
        space_type: "Garage",
        neighborhood: "Kerrytown",
        city: "Ann Arbor",
        state: "MI",
        price_cents: 100,
        price_unit: "month",
        capacity_label: "Boxes",
        available_from: "2026-05-01",
        available_until: "2026-08-20",
        featured: false,
        is_demo: true,
        sample_host_label: "Host",
        listing_photos: [
          { path: "/images/garage-workshop.jpg", alt: "Garage", sort_order: 0, is_primary: true },
        ],
      },
      {
        slug: "broken",
        title: "Broken",
        summary: "x",
        description: "x",
        category: "storage",
        space_type: "Garage",
        neighborhood: "Kerrytown",
        city: "Ann Arbor",
        state: "MI",
        price_cents: 100,
        price_unit: "month",
        capacity_label: "x",
        available_from: "2026-05-01",
        available_until: "2026-08-20",
        featured: false,
        is_demo: false,
        sample_host_label: "Host",
        listing_photos: [],
      },
    ])
    expect(rows.map((row) => row.id)).toEqual(["kept"])
  })

  it("keeps a single card when the same listing is returned twice", () => {
    const row = {
      slug: "shared",
      title: "Shared",
      summary: "A garage.",
      description: "Demo.",
      category: "storage" as const,
      space_type: "Garage",
      neighborhood: "Kerrytown",
      city: "Ann Arbor",
      state: "MI",
      price_cents: 100,
      price_unit: "month" as const,
      capacity_label: "Boxes",
      available_from: "2026-05-01",
      available_until: "2026-08-20",
      featured: false,
      is_demo: true,
      sample_host_label: "Host",
      listing_photos: [{ path: "/images/garage-workshop.jpg", alt: "Garage", sort_order: 0, is_primary: true }],
    }
    expect(mapCatalogRows([row, row]).map((item) => item.id)).toEqual(["shared"])
  })
})

describe("searchListings against Supabase", () => {
  const previous = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  afterEach(() => {
    if (previous.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous.url
    if (previous.key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previous.key
  })

  function listen(handler: RequestListener) {
    const server = createServer(handler)
    return new Promise<{ server: ReturnType<typeof createServer>; url: string }>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address()
        if (!address || typeof address === "string") throw new Error("no port")
        resolve({ server, url: `http://127.0.0.1:${address.port}` })
      })
    })
  }

  it("returns an empty list when the database has no match", async () => {
    const { server, url } = await listen((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" })
      res.end("[]")
    })
    process.env.NEXT_PUBLIC_SUPABASE_URL = url
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    try {
      await expect(
        searchListings({ category: "", neighborhood: "", from: "", until: "", q: "" }),
      ).resolves.toEqual([])
    } finally {
      server.close()
    }
  })

  it("does not substitute the file catalog or reveal a database error", async () => {
    let hits = 0
    const { server, url } = await listen((_req, res) => {
      hits += 1
      res.writeHead(500, { "content-type": "application/json" })
      res.end(JSON.stringify({ message: "relation secret_table does not exist", code: "42P01" }))
    })
    process.env.NEXT_PUBLIC_SUPABASE_URL = url
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    try {
      await expect(
        searchListings({ category: "storage", neighborhood: "", from: "", until: "", q: "" }),
      ).rejects.toBeInstanceOf(CatalogUnavailable)
      await expect(
        searchListings({ category: "storage", neighborhood: "", from: "", until: "", q: "" }),
      ).rejects.toThrow("The demo catalog can't be reached.")
      expect(hits).toBe(2)
    } finally {
      server.close()
    }
  })

  it("does not retry a hanging read", async () => {
    let hits = 0
    const { server, url } = await listen(() => {
      hits += 1
    })
    process.env.NEXT_PUBLIC_SUPABASE_URL = url
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    const started = Date.now()
    try {
      await expect(
        getPublishedListing("kerrytown-garage"),
      ).rejects.toBeInstanceOf(CatalogUnavailable)
      expect(hits).toBe(1)
      expect(Date.now() - started).toBeLessThan(7000)
    } finally {
      server.closeAllConnections?.()
      server.close()
    }
  }, 10000)
})
