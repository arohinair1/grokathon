const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 8
const MAX_MODEL_CALLS = 80

const visitors = new Map<string, number[]>()
let modelCalls = 0

export function allowVisitor(key: string): boolean {
  const now = Date.now()
  const recent = (visitors.get(key) ?? []).filter((time) => now - time < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    visitors.set(key, recent)
    return false
  }
  recent.push(now)
  visitors.set(key, recent)
  return true
}

export function allowModelCall(): boolean {
  if (modelCalls >= MAX_MODEL_CALLS) return false
  modelCalls += 1
  return true
}

export function visitorKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
  const cleaned = forwarded.replace(/[^\w.:-]/g, "").slice(0, 80)
  return cleaned || "local"
}
