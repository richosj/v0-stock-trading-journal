import { NextResponse } from "next/server"
import { requireAuthSession } from "@/lib/auth/server"
import { handleRouteError } from "@/lib/route-response"
import { fetchKoreaMarketSnapshot } from "@/lib/market-feed"

export async function GET() {
  try {
    await requireAuthSession()
    const market = await fetchKoreaMarketSnapshot()

    return NextResponse.json({ market })
  } catch (error) {
    return handleRouteError(error)
  }
}
