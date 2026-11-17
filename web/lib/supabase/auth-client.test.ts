import { afterEach, describe, expect, it } from "vitest"
import {
  authCookieOptions,
  finishSignOut,
  hasAuthSessionCookie,
  isAuthCookieName,
  isAuthRefreshPath,
} from "./auth-client"

describe("auth session cookie hint", () => {
  it("sees a session cookie and ignores the code verifier", () => {
    expect(
      hasAuthSessionCookie([{ name: "sb-abc-auth-token", value: "session" }]),
    ).toBe(true)
    expect(
      hasAuthSessionCookie([{ name: "sb-abc-auth-token.0", value: "chunk" }]),
    ).toBe(true)
    expect(
      hasAuthSessionCookie([{ name: "sb-abc-auth-token-code-verifier", value: "pkce" }]),
    ).toBe(false)
    expect(hasAuthSessionCookie([{ name: "sb-abc-auth-token", value: "" }])).toBe(false)
  })
})

describe("auth cookies", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL
  afterEach(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = previous
  })

  it("keeps the session cookie httpOnly and secure outside localhost", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://college.example"
    expect(authCookieOptions()).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true })
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000"
    expect(authCookieOptions().secure).toBe(false)
  })
})

describe("sign-out cookies", () => {
  it("treats session chunks and verifiers as auth cookies", () => {
    expect(isAuthCookieName("sb-abc-auth-token")).toBe(true)
    expect(isAuthCookieName("sb-abc-auth-token.0")).toBe(true)
    expect(isAuthCookieName("sb-abc-auth-token-code-verifier")).toBe(true)
    expect(isAuthCookieName("theme")).toBe(false)
  })

  it("clears browser cookies when signOut returns an error", async () => {
    let cleared = false
    await finishSignOut(
      { auth: { signOut: async () => ({ error: { message: "down" } }) } },
      () => {
        cleared = true
      },
    )
    expect(cleared).toBe(true)
  })

  it("clears browser cookies when signOut does not finish", async () => {
    let cleared = false
    await finishSignOut(
      { auth: { signOut: () => new Promise(() => undefined) } },
      () => {
        cleared = true
      },
      20,
    )
    expect(cleared).toBe(true)
  })

  it("clears browser cookies when signOut throws", async () => {
    let cleared = false
    await finishSignOut(
      {
        auth: {
          signOut: async () => {
            throw new Error("down")
          },
        },
      },
      () => {
        cleared = true
      },
    )
    expect(cleared).toBe(true)
  })
})

describe("auth refresh paths", () => {
  it("refreshes account routes and leaves the catalog and sign-out alone", () => {
    expect(isAuthRefreshPath("/account")).toBe(true)
    expect(isAuthRefreshPath("/reset-password")).toBe(true)
    expect(isAuthRefreshPath("/auth/callback")).toBe(true)
    expect(isAuthRefreshPath("/auth/recover")).toBe(true)
    expect(isAuthRefreshPath("/auth/sign-out")).toBe(false)
    expect(isAuthRefreshPath("/")).toBe(false)
    expect(isAuthRefreshPath("/search")).toBe(false)
    expect(isAuthRefreshPath("/listings/kerrytown-garage")).toBe(false)
    expect(isAuthRefreshPath("/host")).toBe(true)
    expect(isAuthRefreshPath("/host/listings/new")).toBe(true)
  })
})
