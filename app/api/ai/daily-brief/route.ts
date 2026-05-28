import { NextResponse } from "next/server"
import { requireAuthSession } from "@/lib/auth/server"
import { handleRouteError } from "@/lib/route-response"
import { fetchKoreaMarketSnapshot, fetchUsMarketNews } from "@/lib/market-feed"
import { generateDailyMarketBrief } from "@/lib/gemini-brief"
import { buildFallbackMarketBrief } from "@/lib/market-brief-fallback"
import { listJournalsForSession } from "@/lib/server-trading-service"

function looksLikeUsTicker(ticker: string) {
  return /^[A-Za-z][A-Za-z0-9.-]{0,14}$/.test(ticker.trim())
}

export async function GET() {
  try {
    const session = await requireAuthSession()
    const journals = await listJournalsForSession(session)

    const korea = await fetchKoreaMarketSnapshot()
    const holdings = journals
      .filter((journal) => journal.exit_price == null && looksLikeUsTicker(journal.ticker))
      .map((journal) => ({
        ticker: journal.ticker.toUpperCase(),
        companyName: journal.company_name,
      }))

    const news = await fetchUsMarketNews(holdings)
    const context = {
      session,
      journals,
      korea,
      headlines: news.headlines,
      relatedNews: news.related,
    }

    try {
      const brief = await generateDailyMarketBrief(context)
      return NextResponse.json({
        brief: { ...brief, source: "gemini" as const, notice: null },
      })
    } catch (aiError) {
      const notice =
        aiError instanceof Error
          ? aiError.message
          : "Gemini API를 사용할 수 없습니다."

      const brief = buildFallbackMarketBrief({
        session,
        journals,
        korea,
        headlines: news.headlines,
        notice,
      })

      return NextResponse.json({ brief })
    }
  } catch (error) {
    return handleRouteError(error)
  }
}
