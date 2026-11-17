import { searchColleges } from "@/lib/directory-data"

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get("q") ?? ""
  const colleges = await searchColleges(term, 8)
  if (colleges === null) {
    return Response.json({ colleges: [] }, { status: 503 })
  }
  return Response.json({
    colleges: colleges.map((college) => ({
      slug: college.slug,
      name: college.name,
      city: college.city,
      stateName: college.stateName,
      marketStatus: college.marketStatus,
    })),
  })
}
