import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { yaleListings } from "@/lib/yale/listings"

describe("yale sample catalog", () => {
  it("keeps a separate fictional New Haven catalog", () => {
    expect(yaleListings.length).toBeGreaterThanOrEqual(8)
    expect(yaleListings.length).toBeLessThanOrEqual(12)
    expect(yaleListings.every((listing) => listing.city === "New Haven" && listing.demo && listing.illustrativePrice)).toBe(true)
    expect(yaleListings.filter((listing) => listing.category === "storage").length).toBeGreaterThan(
      yaleListings.filter((listing) => listing.category === "monthly-parking").length,
    )
    const text = JSON.stringify(yaleListings).toLowerCase()
    expect(text).not.toContain("ann arbor")
    expect(text).not.toContain("michigan")
    expect(text).not.toContain("university of michigan")
  })

  it("does not put Ann Arbor copy on the public Yale screens", () => {
    const root = fileURLToPath(new URL("../..", import.meta.url))
    const files = [
      "app/page.tsx",
      "app/layout.tsx",
      "app/search/page.tsx",
      "app/find/page.tsx",
      "app/listings/[id]/page.tsx",
      "components/site-header.tsx",
      "components/site-footer.tsx",
      "components/home/featured.tsx",
      "components/home/categories.tsx",
      "components/home/how-it-works.tsx",
      "components/home/host-band.tsx",
    ]
    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8").toLowerCase()
      expect(source, file).not.toContain("ann arbor")
      expect(source, file).not.toContain("michigan")
    }
  })
})
