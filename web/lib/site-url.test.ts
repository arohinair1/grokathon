import { afterEach, describe, expect, it } from "vitest"
import { siteOrigin } from "./site-url"

describe("siteOrigin", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL

  afterEach(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = previous
  })

  it("accepts an https origin and local development", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://college.example"
    expect(siteOrigin()).toBe("https://college.example")
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000"
    expect(siteOrigin()).toBe("http://localhost:3000")
  })

  it("rejects other hosts, paths, and http preview URLs", () => {
    for (const value of [
      "",
      "http://college.example",
      "https://college.example/auth",
      "https://user:pass@college.example",
      "https://college.example?next=/",
      "not a url",
    ]) {
      process.env.NEXT_PUBLIC_SITE_URL = value
      expect(siteOrigin()).toBeNull()
    }
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(siteOrigin()).toBeNull()
  })
})
