import { afterEach, describe, expect, it, vi } from "vitest"
import { grokChatEndpoint, grokConfigured, grokModel } from "@/lib/spacematch/grok"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("Grok client configuration", () => {
  it("defaults the model and the xAI chat endpoint", () => {
    vi.stubEnv("XAI_MODEL", "")
    vi.stubEnv("XAI_API_BASE_URL", "")
    vi.stubEnv("XAI_API_KEY", "")
    expect(grokModel()).toBe("grok-4.7")
    expect(grokChatEndpoint()).toBe("https://api.x.ai/v1/chat/completions")
    expect(grokConfigured()).toBe(false)
  })

  it("accepts an https API root and a model id", () => {
    vi.stubEnv("XAI_MODEL", "grok-4.3")
    vi.stubEnv("XAI_API_BASE_URL", "https://api.x.ai/v1/")
    expect(grokModel()).toBe("grok-4.3")
    expect(grokChatEndpoint()).toBe("https://api.x.ai/v1/chat/completions")
  })

  it("ignores a non-https endpoint instead of calling it", () => {
    vi.stubEnv("XAI_API_BASE_URL", "http://127.0.0.1:9/v1")
    expect(grokChatEndpoint()).toBe("https://api.x.ai/v1/chat/completions")
  })
})
