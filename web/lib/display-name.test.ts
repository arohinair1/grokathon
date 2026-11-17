import { describe, expect, it } from "vitest"
import { parseDisplayName } from "./display-name"

describe("parseDisplayName", () => {
  it("trims a usable name", () => {
    expect(parseDisplayName("  Arohi  ")).toEqual({ ok: true, value: "Arohi" })
  })

  it("rejects empty, long, and control names", () => {
    expect(parseDisplayName("   ").ok).toBe(false)
    expect(parseDisplayName("a".repeat(81)).ok).toBe(false)
    expect(parseDisplayName("a\u0007b").ok).toBe(false)
    expect(parseDisplayName("\u202Eadmin").ok).toBe(false)
    expect(parseDisplayName("left\u2066right").ok).toBe(false)
  })
})
