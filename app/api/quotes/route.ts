import { NextRequest, NextResponse } from 'next/server'
import {
  resolveQuoteCandidates,
  type LiveQuote,
  type QuoteRequestPosition,
} from '@/lib/market-quotes'

type YahooChartMeta = {
  currency?: string
  symbol?: string
  regularMarketPrice?: number
  chartPreviousClose?: number
  regularMarketTime?: number
}

async function fetchYahooQuote(symbol: string): Promise<YahooChartMeta | null> {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      next: { revalidate: 30 },
    }
  )

  if (!response.ok) {
    return null
  }

  const payload = await response.json()
  return payload?.chart?.result?.[0]?.meta ?? null
}

async function resolveLiveQuote(position: QuoteRequestPosition): Promise<LiveQuote> {
  const candidates = resolveQuoteCandidates(position)

  if (candidates.length === 0) {
    return {
      journalId: position.id,
      companyName: position.company_name,
      inputTicker: position.ticker,
      resolvedSymbol: null,
      currency: null,
      regularMarketPrice: null,
      previousClose: null,
      change: null,
      changePercent: null,
      marketTime: null,
      error: '실시간 조회용 티커가 필요합니다.',
    }
  }

  for (const symbol of candidates) {
    try {
      const meta = await fetchYahooQuote(symbol)

      if (!meta?.regularMarketPrice || !meta?.chartPreviousClose) {
        continue
      }

      const change = meta.regularMarketPrice - meta.chartPreviousClose
      const changePercent =
        meta.chartPreviousClose > 0 ? (change / meta.chartPreviousClose) * 100 : null

      return {
        journalId: position.id,
        companyName: position.company_name,
        inputTicker: position.ticker,
        resolvedSymbol: meta.symbol ?? symbol,
        currency: meta.currency ?? null,
        regularMarketPrice: meta.regularMarketPrice,
        previousClose: meta.chartPreviousClose,
        change,
        changePercent,
        marketTime: meta.regularMarketTime ?? null,
        error: null,
      }
    } catch {
      continue
    }
  }

  return {
    journalId: position.id,
    companyName: position.company_name,
    inputTicker: position.ticker,
    resolvedSymbol: null,
    currency: null,
    regularMarketPrice: null,
    previousClose: null,
    change: null,
    changePercent: null,
    marketTime: null,
    error: '시세를 불러오지 못했습니다.',
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const positions = Array.isArray(body?.positions)
      ? (body.positions as QuoteRequestPosition[])
      : []

    const quotes = await Promise.all(positions.map(resolveLiveQuote))

    return NextResponse.json({ quotes })
  } catch (error) {
    return NextResponse.json(
      { error: '실시간 시세를 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}
