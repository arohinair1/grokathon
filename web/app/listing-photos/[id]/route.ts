import { NextResponse } from "next/server"
import { createAnonClient } from "@/lib/supabase"
import { createServerAuthClient } from "@/lib/supabase/server"

const NO_STORE = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex",
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return new NextResponse("Not found.", { status: 404, headers: NO_STORE })
  }

  const supabase = (await createServerAuthClient()) ?? createAnonClient()
  if (!supabase) return new NextResponse("Not found.", { status: 404, headers: NO_STORE })

  const { data, error } = await supabase
    .from("listing_photos")
    .select("path")
    .eq("id", id)
    .maybeSingle()
  if (error || !data?.path || data.path.startsWith("/") || data.path.includes("..")) {
    return new NextResponse("Not found.", { status: 404, headers: NO_STORE })
  }

  const file = await supabase.storage.from("listing-photos").download(data.path)
  if (file.error || !file.data) return new NextResponse("Not found.", { status: 404, headers: NO_STORE })
  const bytes = new Uint8Array(await file.data.arrayBuffer())
  const type = data.path.endsWith(".png") ? "image/png" : data.path.endsWith(".webp") ? "image/webp" : "image/jpeg"
  return new NextResponse(bytes, {
    headers: { ...NO_STORE, "content-type": type },
  })
}
