import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("profiles migration", () => {
  it("does not define auth.uid", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20261014040000_profiles.sql"),
      "utf8",
    )
    expect(sql).not.toMatch(/create\s+(or\s+replace\s+)?function\s+auth\.uid/i)
    expect(sql).toMatch(/revoke all on public\.profiles from public, anon, authenticated/i)
    expect(sql).toMatch(/security definer/i)
    expect(sql).toMatch(/set search_path = ''/i)
  })
})
