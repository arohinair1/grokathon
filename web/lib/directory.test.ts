import { describe, expect, it } from "vitest"
import { planCollegeImport, parseCsv, parseIpedsDirectory } from "./college-import"
import {
  ANN_ARBOR_COLLEGE,
  collegeSearchTerm,
  dedupeById,
  marketLabel,
  slugifyCollegeName,
  stateBySlug,
  stateSlug,
  uniqueCollegeSlug,
} from "./directory"

describe("state and college identity", () => {
  it("builds stable state slugs", () => {
    expect(stateSlug("Michigan")).toBe("michigan")
    expect(stateSlug("New York")).toBe("new-york")
    expect(stateSlug("District of Columbia")).toBe("district-of-columbia")
    expect(stateBySlug([{ code: "MI", name: "Michigan", slug: "michigan", collegeCount: 1, activeCount: 1 }], "michigan")?.code).toBe("MI")
    expect(stateBySlug([], "nope")).toBeNull()
  })

  it("keeps the Ann Arbor slug stable across the en dash", () => {
    expect(slugifyCollegeName("University of Michigan–Ann Arbor")).toBe("university-of-michigan-ann-arbor")
    expect(slugifyCollegeName("University of Michigan-Ann Arbor")).toBe(ANN_ARBOR_COLLEGE.slug)
  })

  it("does not treat a shared name as the same college", () => {
    const taken = new Set(["planned-fixture-college"])
    const second = uniqueCollegeSlug("Planned fixture college", "Madison", "WI", "999002", taken)
    expect(second).not.toBe("planned-fixture-college")
    expect(second).toContain("madison")
  })

  it("labels markets without calling a planned college open", () => {
    expect(marketLabel("active")).toBe("Open")
    expect(marketLabel("planned")).toBe("Coming soon")
    expect(marketLabel("paused")).toBe("Paused")
  })

  it("rejects wildcards and short searches", () => {
    expect(collegeSearchTerm(" U ")).toBeNull()
    expect(collegeSearchTerm(" University of Michigan % ")).toBe("University of Michigan")
  })

  it("keeps one card when a listing is linked twice in a result set", () => {
    expect(dedupeById([{ id: "a" }, { id: "a" }, { id: "b" }])).toEqual([{ id: "a" }, { id: "b" }])
  })
})

describe("IPEDS import plan", () => {
  it("parses quoted directory rows and skips closed institutions", () => {
    const csv = [
      "UNITID,INSTNM,CITY,STABBR,IALIAS,CYACTIVE,CLOSEDAT,NEWID",
      "170976,University of Michigan-Ann Arbor,Ann Arbor,MI,U of M|University of Michigan,1,-2,-2",
      "999001,\"Planned fixture college\",Madison,WI,,1,-2,-2",
      "999002,\"Planned fixture college\",Ann Arbor,MI,,1,-2,-2",
      "999003,Closed College,Madison,WI,,0,2020-01-01,-2",
      "999004,Territory College,San Juan,PR,,1,-2,-2",
    ].join("\n")
    const parsed = parseIpedsDirectory(csv)
    expect(parsed.rejected).toBe(0)
    expect(parsed.rows.filter((row) => row.closed)).toHaveLength(2)
    const plan = planCollegeImport(
      [
        {
          id: ANN_ARBOR_COLLEGE.id,
          slug: ANN_ARBOR_COLLEGE.slug,
          name: ANN_ARBOR_COLLEGE.name,
          city: "Ann Arbor",
          stateCode: "MI",
          marketStatus: "active",
          sourceId: null,
        },
      ],
      parsed.rows,
    )
    const michigan = plan.actions.find((action) => action.sourceId === "170976")
    expect(michigan).toMatchObject({
      kind: "update",
      id: ANN_ARBOR_COLLEGE.id,
      slug: ANN_ARBOR_COLLEGE.slug,
      name: ANN_ARBOR_COLLEGE.name,
      marketStatus: null,
    })
    expect(plan.preservedActive).toBe(1)
    const inserts = plan.actions.filter((action) => action.kind === "insert")
    expect(inserts).toHaveLength(2)
    expect(inserts.every((action) => action.marketStatus === "planned")).toBe(true)
    expect(new Set(inserts.map((action) => action.slug)).size).toBe(2)
    expect(plan.actions.some((action) => action.sourceId === "999003" || action.sourceId === "999004")).toBe(false)
  })

  it("keeps quoted commas inside a cell", () => {
    expect(parseCsv('UNITID,INSTNM\n1,"Alpha, Beta"\n')[1]).toEqual(["1", "Alpha, Beta"])
  })
})
