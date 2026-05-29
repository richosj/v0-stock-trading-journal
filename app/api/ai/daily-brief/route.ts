import { NextResponse } from "next/server"
import { requireAuthSession } from "@/lib/auth/server"
import { handleRouteError } from "@/lib/route-response"
import { fetchKoreaMarketSnapshot, fetchKoreaStockFundamentals, fetchUsMarketNews } from "@/lib/market-feed"
import { generateDailyMarketBrief } from "@/lib/gemini-brief"
import { buildFallbackMarketBrief } from "@/lib/market-brief-fallback"
import { listJournalsForSession } from "@/lib/server-trading-service"
import { resolveQuoteCandidates } from "@/lib/market-quotes"
import type { DailyAiBrief } from "@/lib/gemini-brief-types"
import { ensureWatchlistMinimum, koreaSnapshotHasData } from "@/lib/brief-watchlist-utils"

function looksLikeUsTicker(ticker: string) {
  return /^[A-Za-z][A-Za-z0-9.-]{0,14}$/.test(ticker.trim())
}

type YahooChartMeta = {
  currency?: string
  symbol?: string
  regularMarketPrice?: number
  chartPreviousClose?: number
}

async function fetchYahooQuote(symbol: string): Promise<YahooChartMeta | null> {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 30 },
    }
  )

  if (!response.ok) return null
  const payload = await response.json()
  return payload?.chart?.result?.[0]?.meta ?? null
}

async function resolveHoldingQuotes(
  journals: Awaited<ReturnType<typeof listJournalsForSession>>
) {
  const open = journals.filter((journal) => journal.exit_price == null).slice(0, 8)
  const rows = await Promise.all(
    open.map(async (journal) => {
      const candidates = resolveQuoteCandidates({
        id: journal.id,
        ticker: journal.ticker,
        company_name: journal.company_name,
        entry_price: journal.entry_price,
        quantity: journal.quantity,
      })
      for (const symbol of candidates) {
        try {
          const meta = await fetchYahooQuote(symbol)
          if (!meta?.regularMarketPrice || !meta?.chartPreviousClose) continue
          const changePercent =
            meta.chartPreviousClose > 0
              ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
              : null
          return {
            journalId: journal.id,
            ticker: journal.ticker,
            regularMarketPrice: meta.regularMarketPrice,
            changePercent,
            currency: meta.currency ?? null,
          }
        } catch {
          continue
        }
      }
      return {
        journalId: journal.id,
        ticker: journal.ticker,
        regularMarketPrice: null,
        changePercent: null,
        currency: null,
      }
    })
  )
  return rows
}

async function enrichWatchlistEvidence(brief: DailyAiBrief) {
  const krCodes = brief.watchlist
    .map((item) => item.ticker.trim())
    .filter((ticker) => /^\d{5,6}$/.test(ticker))
  if (krCodes.length === 0) return brief

  const details = await fetchKoreaStockFundamentals(krCodes)
  const detailMap = new Map(details.map((detail) => [detail.code, detail]))

  const watchlist = brief.watchlist.map((item) => {
    const detail = detailMap.get(item.ticker.trim())
    if (!detail) return item
    const evidence = {
      prevClose: detail.prevClose,
      open: detail.open,
      high: detail.high,
      low: detail.low,
      volume: detail.volume,
      value: detail.value,
      marketCap: detail.marketCap,
      per: detail.per,
      pbr: detail.pbr,
      eps: detail.eps,
    }

    const metricsText = [
      detail.value ? `거래대금 ${detail.value}` : null,
      detail.volume ? `거래량 ${detail.volume}` : null,
      detail.per ? `PER ${detail.per}` : null,
      detail.pbr ? `PBR ${detail.pbr}` : null,
    ]
      .filter(Boolean)
      .join(" · ")

    const entryScore = computeEntrySuitabilityScore(item, detail)
    return {
      ...item,
      reason: metricsText ? `${item.reason} | 근거지표: ${metricsText}` : item.reason,
      risk:
        detail.low && detail.prevClose
          ? `${item.risk} (전일 ${detail.prevClose}, 저가 ${detail.low} 이탈 여부 체크)`
          : item.risk,
      evidence,
      entryScore,
    }
  })

  return { ...brief, watchlist }
}

async function enrichWatchlistEvidenceSafe(brief: DailyAiBrief) {
  try {
    return await enrichWatchlistEvidence(brief)
  } catch {
    return brief
  }
}

function finalizeBrief(brief: DailyAiBrief, korea: Awaited<ReturnType<typeof fetchKoreaMarketSnapshot>>) {
  const watchlist = ensureWatchlistMinimum(brief.watchlist, korea)
  const marketDataWarning = !koreaSnapshotHasData(korea)
    ? "시장 랭킹 데이터를 불러오지 못해 추천 품질이 제한될 수 있습니다. 잠시 후 새로고침해 주세요."
    : null

  const notice = [brief.notice, marketDataWarning].filter(Boolean).join(" ") || null

  return {
    ...brief,
    watchlist,
    notice,
  }
}

function parsePercentLike(value: string | null) {
  if (!value) return null
  const n = Number(value.replace(/,/g, "").replace(/[^\d.-]/g, ""))
  return Number.isFinite(n) ? n : null
}

function parseKoreanNumber(value: string | null) {
  if (!value) return null
  const normalized = value.replace(/,/g, "").trim()
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function computeEntrySuitabilityScore(
  item: DailyAiBrief["watchlist"][number],
  detail: {
    prevClose: string | null
    open: string | null
    high: string | null
    low: string | null
    volume: string | null
    value: string | null
    marketCap: string | null
    per: string | null
    pbr: string | null
    eps: string | null
  }
) {
  let score = 55

  const per = parsePercentLike(detail.per)
  const pbr = parsePercentLike(detail.pbr)
  const open = parseKoreanNumber(detail.open)
  const high = parseKoreanNumber(detail.high)
  const low = parseKoreanNumber(detail.low)
  const prev = parseKoreanNumber(detail.prevClose)

  if (per != null) {
    if (per >= 6 && per <= 25) score += 7
    else if (per > 45 || per < 1) score -= 7
  }
  if (pbr != null) {
    if (pbr >= 0.8 && pbr <= 4.5) score += 5
    else if (pbr > 8) score -= 6
  }

  if (open != null && high != null && low != null && prev != null && prev > 0) {
    const intradayRangePct = ((high - low) / prev) * 100
    if (intradayRangePct >= 2 && intradayRangePct <= 8) score += 8
    else if (intradayRangePct > 12) score -= 10

    const openGapPct = ((open - prev) / prev) * 100
    if (Math.abs(openGapPct) > 6) score -= 8
  }

  if (item.reason.includes("거래")) score += 4
  if (item.reason.includes("뉴스")) score += 4
  if (item.risk.includes("과열")) score -= 6
  if (item.risk.includes("급등락")) score -= 5

  return Math.max(0, Math.min(100, Math.round(score)))
}

export async function GET() {
  try {
    const session = await requireAuthSession()
    const journals = await listJournalsForSession(session)

    const [korea, news, holdingQuotes] = await Promise.all([
      fetchKoreaMarketSnapshot(),
      fetchUsMarketNews(
        journals
          .filter((journal) => journal.exit_price == null && looksLikeUsTicker(journal.ticker))
          .map((journal) => ({
            ticker: journal.ticker.toUpperCase(),
            companyName: journal.company_name,
          }))
      ),
      resolveHoldingQuotes(journals),
    ])
    const context = {
      session,
      journals,
      korea,
      headlines: news.headlines,
      relatedNews: news.related,
      holdingQuotes,
    }

    try {
      const aiBrief = await generateDailyMarketBrief(context)
      const enriched = await enrichWatchlistEvidenceSafe(aiBrief)
      const brief = finalizeBrief({ ...enriched, source: "gemini" as const, notice: null }, korea)
      return NextResponse.json({ brief })
    } catch (aiError) {
      const notice =
        aiError instanceof Error
          ? aiError.message
          : "Gemini API를 사용할 수 없습니다."

      const fallback = buildFallbackMarketBrief({
        session,
        journals,
        korea,
        headlines: news.headlines,
        holdingQuotes,
        notice,
      })
      const enriched = await enrichWatchlistEvidenceSafe(fallback)
      const brief = finalizeBrief(enriched, korea)

      return NextResponse.json({ brief })
    }
  } catch (error) {
    return handleRouteError(error)
  }
}
