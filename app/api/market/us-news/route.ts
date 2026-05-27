import { NextRequest, NextResponse } from "next/server"
import { requireAuthSession } from "@/lib/auth/server"
import { handleRouteError } from "@/lib/route-response"
import { fetchUsMarketNews } from "@/lib/market-feed"

type HoldingPayload = {
  ticker?: string
  companyName?: string
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthSession()
    const body = await request.json().catch(() => null)
    const holdings = Array.isArray(body?.holdings)
      ? (body.holdings as HoldingPayload[])
          .map((holding) => ({
            ticker: holding.ticker?.trim() ?? "",
            companyName: holding.companyName?.trim() ?? "",
          }))
          .filter((holding) => holding.ticker)
      : []

    const news = await fetchUsMarketNews(holdings)
    return NextResponse.json({ news })
  } catch (error) {
    return handleRouteError(error)
  }
}
