import { describe, expect, it } from "vitest"
import { shownDisplayName } from "@/lib/auth-copy"
import { hasRecoveryContext } from "@/lib/auth/recovery"

describe("display name after save", () => {
  it("shows the persisted name instead of the stale server value", () => {
    expect(shownDisplayName("Old name", { message: "Saved.", displayName: "New name" })).toBe(
      "New name",
    )
  })

  it("keeps what the person typed when the save is rejected", () => {
    expect(
      shownDisplayName("Old name", { error: "We couldn’t save that name.", displayName: "New name" }),
    ).toBe("New name")
  })

  it("uses the server name before any save", () => {
    expect(shownDisplayName("Old name", {})).toBe("Old name")
  })
})

describe("password recovery context", () => {
  it("accepts only the recovery cookie set by the recovery callback", () => {
    expect(hasRecoveryContext("1")).toBe(true)
    expect(hasRecoveryContext(undefined)).toBe(false)
    expect(hasRecoveryContext("")).toBe(false)
  })
})
