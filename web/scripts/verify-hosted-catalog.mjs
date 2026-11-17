import { checkHostedCatalog } from "../lib/hosted-catalog-check.mjs"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.log("hosted-catalog-check skipped (no Supabase env)")
  process.exit(0)
}

let host = "unknown"
try {
  host = new URL(url).host
} catch {
  console.error("hosted-catalog-check failed: NEXT_PUBLIC_SUPABASE_URL is not a URL")
  process.exit(1)
}

try {
  const result = await checkHostedCatalog({ url, anonKey })
  console.log(JSON.stringify({ host, ...result }))
  if (!result.ok) process.exit(1)
} catch (error) {
  console.error(`hosted-catalog-check failed: ${error instanceof Error ? error.message : "unknown error"}`)
  process.exit(1)
}
