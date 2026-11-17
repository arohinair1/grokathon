import { exchangeAuthCode } from "@/lib/supabase/exchange-code"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  return exchangeAuthCode(request, "/reset-password")
}
