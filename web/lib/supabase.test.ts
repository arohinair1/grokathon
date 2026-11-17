import { afterEach, describe, expect, it } from "vitest"
import { supabaseProjectOrigin, supabasePublicEnv } from "./supabase"

describe("supabaseProjectOrigin", () => {
  it("keeps a project origin and drops a pasted REST path", () => {
    expect(supabaseProjectOrigin("https://example.supabase.co")).toBe(
      "https://example.supabase.co",
    )
    expect(supabaseProjectOrigin(" https://example.supabase.co/rest/v1/ ")).toBe(
      "https://example.supabase.co",
    )
    expect(supabaseProjectOrigin("http://127.0.0.1:3033")).toBe("http://127.0.0.1:3033")
    expect(supabaseProjectOrigin("not a url")).toBeNull()
  })
})

describe("supabasePublicEnv", () => {
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

  it("returns the origin when both public values are set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co/rest/v1"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key"
    expect(supabasePublicEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "public-anon-key",
    })
  })

  it("stays on the file catalog when a value is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key"
    expect(supabasePublicEnv()).toBeNull()
  })
})
