import { allowModelCall } from "@/lib/spacematch/limit"

const DEFAULT_API_BASE = "https://api.x.ai/v1"
const DEFAULT_MODEL = "grok-4.7"

export type GrokFailure = "unconfigured" | "upstream" | "invalid" | "limited"

export function grokModel(): string {
  const configured = process.env.XAI_MODEL?.trim() ?? ""
  if (/^[A-Za-z0-9._-]{1,64}$/.test(configured)) return configured
  return DEFAULT_MODEL
}

export function grokConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim())
}

/** API root, for example https://api.x.ai/v1. A full chat-completions URL is also accepted. */
export function grokApiBase(): string {
  const configured = process.env.XAI_API_BASE_URL?.trim() || ""
  if (!configured) return DEFAULT_API_BASE
  try {
    const url = new URL(configured)
    if (url.protocol !== "https:" || url.username || url.password) return DEFAULT_API_BASE
    return url.toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_API_BASE
  }
}

export function grokChatEndpoint(): string {
  const base = grokApiBase()
  if (base.endsWith("/chat/completions")) return base
  return `${base}/chat/completions`
}

type ChatBody = {
  model: string
  messages: { role: "system" | "user"; content: string }[]
  response_format: {
    type: "json_schema"
    json_schema: { name: string; strict: true; schema: Record<string, unknown> }
  }
  reasoning_effort?: "low"
}

async function postChat(body: ChatBody, key: string): Promise<Response> {
  return fetch(grokChatEndpoint(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(28_000),
  })
}

export async function grokJson(options: {
  schemaName: string
  schema: Record<string, unknown>
  system: string
  user: string
}): Promise<{ ok: true; model: string; value: unknown } | { ok: false; reason: GrokFailure }> {
  const key = process.env.XAI_API_KEY?.trim()
  if (!key) return { ok: false, reason: "unconfigured" }
  if (!allowModelCall()) return { ok: false, reason: "limited" }
  const model = grokModel()
  const base: ChatBody = {
    model,
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: options.schemaName,
        strict: true,
        schema: options.schema,
      },
    },
    reasoning_effort: "low",
  }

  let response: Response
  try {
    response = await postChat(base, key)
    if (response.status === 400) {
      const retry = { ...base }
      delete retry.reasoning_effort
      response = await postChat(retry, key)
    }
  } catch {
    return { ok: false, reason: "upstream" }
  }

  if (!response.ok) return { ok: false, reason: "upstream" }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return { ok: false, reason: "invalid" }
  }

  const content = readContent(payload)
  if (!content) return { ok: false, reason: "invalid" }
  try {
    return { ok: true, model, value: JSON.parse(content) as unknown }
  } catch {
    return { ok: false, reason: "invalid" }
  }
}

function readContent(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const choices = "choices" in payload ? payload.choices : null
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") return null
  const message = "message" in choices[0] ? choices[0].message : null
  if (!message || typeof message !== "object" || !("content" in message)) return null
  const content = message.content
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : ""))
      .join("")
    return text || null
  }
  return null
}
