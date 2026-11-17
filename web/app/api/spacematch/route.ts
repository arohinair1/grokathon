import { allowVisitor, visitorKey } from "@/lib/spacematch/limit"
import { runSpaceMatch } from "@/lib/spacematch/run"

export const maxDuration = 60

type IncomingMessage = { role?: unknown; content?: unknown }

function readMessages(value: unknown): string[] | null {
  if (!value || typeof value !== "object" || !("messages" in value) || !Array.isArray(value.messages)) return null
  const messages = value.messages as IncomingMessage[]
  if (messages.length < 1 || messages.length > 8) return null
  const contents: string[] = []
  for (const message of messages) {
    if (message.role !== "user" || typeof message.content !== "string") return null
    const content = message.content.trim()
    if (content.length < 2 || content.length > 2000) return null
    contents.push(content)
  }
  return contents
}

function readOverride(value: unknown): number | null {
  if (!value || typeof value !== "object" || !("capacityOverrideCuFt" in value)) return null
  const override = value.capacityOverrideCuFt
  if (override === null || override === undefined || override === "") return null
  if (typeof override !== "number" || !Number.isInteger(override) || override < 1 || override > 2000) return null
  return override
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Send a JSON request." }, { status: 400 })
  }
  if (!allowVisitor(visitorKey(request))) {
    return Response.json({ error: "Too many SpaceMatch requests. Wait a few minutes and try again." }, { status: 429 })
  }
  const messages = readMessages(body)
  if (!messages) return Response.json({ error: "Add a short description of what you need." }, { status: 400 })
  const override = readOverride(body)
  if (body && typeof body === "object" && "capacityOverrideCuFt" in body && body.capacityOverrideCuFt != null && override === null) {
    return Response.json({ error: "The capacity estimate has to be a whole number of cubic feet." }, { status: 400 })
  }
  try {
    const result = await runSpaceMatch({ messages, capacityOverrideCuFt: override })
    return Response.json(result)
  } catch {
    return Response.json({ error: "SpaceMatch could not finish that request." }, { status: 502 })
  }
}
