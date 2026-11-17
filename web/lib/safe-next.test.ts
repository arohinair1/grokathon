import { afterEach, describe, expect, it } from "vitest"
import { safeNextPath } from "./safe-next"

const ORIGIN = "https://college.example"

describe("safeNextPath", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL

  afterEach(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = previous
  })

  it("keeps an in-app path and its query", () => {
    expect(safeNextPath("/account", ORIGIN)).toBe("/account")
    expect(safeNextPath("/account?tab=1", ORIGIN)).toBe("/account?tab=1")
    expect(safeNextPath("/account?tab=1#name", ORIGIN)).toBe("/account?tab=1#name")
  })

  it.each([
    "//a.example",
    "/\\a.example",
    "/.//a.example",
    "/x/..//a.example",
    "/%2e//a.example",
    "/%5Ca.example",
    "/%2F/a.example",
    "/%09/a.example",
    "/%0a/a.example",
    "/%0d/a.example",
    "/%09%5Ca.example",
    "https://a.example",
    "%",
    "",
    "   ",
    "account",
    "/account\n",
  ])("rejects %j", (next) => {
    expect(safeNextPath(next, ORIGIN)).toBe("/account")
  })

  it("uses the configured origin and fails closed when it is missing", () => {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGIN
    expect(safeNextPath("/search")).toBe("/search")
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(safeNextPath("/search")).toBe("/account")
  })
})
