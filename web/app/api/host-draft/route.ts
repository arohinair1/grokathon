import { yaleToday } from "@/lib/spacematch/assumptions"
import { draftListing } from "@/lib/spacematch/host-draft"
import { allowVisitor, visitorKey } from "@/lib/spacematch/limit"

export const maxDuration = 60

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Send a JSON request." }, { status: 400 })
  }
  const description =
    body && typeof body === "object" && "description" in body && typeof body.description === "string"
      ? body.description.trim()
      : ""
  if (!allowVisitor(`draft:${visitorKey(request)}`)) {
    return Response.json({ error: "Too many draft requests. Wait a few minutes and try again." }, { status: 429 })
  }
  if (description.length < 12 || description.length > 2000) {
    return Response.json({ error: "Describe the space in a sentence or two." }, { status: 400 })
  }
  try {
    const result = await draftListing(description, yaleToday())
    return Response.json(result)
  } catch {
    return Response.json({ error: "The draft assistant could not finish that request." }, { status: 502 })
  }
}
