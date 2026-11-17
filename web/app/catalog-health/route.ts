import { connection } from "next/server"
import { NextResponse } from "next/server"
import { checkHostedCatalogRead } from "@/lib/hosted-catalog-check.mjs"
import { supabasePublicEnv } from "@/lib/supabase"

export async function GET() {
  await connection()
  const headers = {
    "cache-control": "no-store",
    "x-robots-tag": "noindex",
  }
  const env = supabasePublicEnv()
  if (!env) {
    return NextResponse.json({ source: "file" }, { headers })
  }
  try {
    const result = await checkHostedCatalogRead(env)
    return NextResponse.json(
      { source: "supabase", ...result },
      { status: result.ok ? 200 : 503, headers },
    )
  } catch {
    return NextResponse.json(
      {
        source: "supabase",
        ok: false,
        problems: ["catalog check failed"],
      },
      { status: 503, headers },
    )
  }
}
