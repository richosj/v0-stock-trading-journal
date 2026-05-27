'use client'

import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/trading/header'
import { TodayMarketHub } from '@/components/trading/today-market-hub'
import { AiMarketBrief } from '@/components/trading/ai-market-brief'
import { fetchAllJournals } from '@/lib/trading-service'
import type { TradingJournal } from '@/lib/supabase'
import type { KoreaMarketSnapshot, UsNewsItem } from '@/lib/market-feed'
import type { DailyAiBrief } from '@/lib/gemini-brief-types'

type UsNewsPayload = {
  headlines?: UsNewsItem[]
  related?: UsNewsItem[]
}

function looksLikeUsTicker(ticker: string) {
  return /^[A-Za-z][A-Za-z0-9.-]{0,14}$/.test(ticker.trim())
}

export default function MarketPage() {
  const [journals, setJournals] = useState<TradingJournal[]>([])
  const [korea, setKorea] = useState<KoreaMarketSnapshot | null>(null)
  const [headlines, setHeadlines] = useState<UsNewsItem[]>([])
  const [relatedNews, setRelatedNews] = useState<UsNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiBrief, setAiBrief] = useState<DailyAiBrief | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const usHoldings = useMemo(() => {
    const unique = new Map<string, { ticker: string; companyName: string }>()

    for (const journal of journals) {
      const ticker = journal.ticker.trim().toUpperCase()
      if (!ticker || !looksLikeUsTicker(ticker)) {
        continue
      }

      if (!unique.has(ticker)) {
        unique.set(ticker, {
          ticker,
          companyName: journal.company_name,
        })
      }
    }

    return [...unique.values()]
  }, [journals])

  const loadAiBrief = async () => {
    setAiLoading(true)
    setAiError(null)

    try {
      const response = await fetch('/api/ai/daily-brief', { cache: 'no-store' })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'AI 브리핑을 불러오지 못했습니다.')
      }

      const payload = (await response.json()) as { brief: DailyAiBrief }
      setAiBrief(payload.brief ?? null)
    } catch (err: any) {
      setAiError(err?.message || 'AI 브리핑을 불러오지 못했습니다.')
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const journalsData = await fetchAllJournals()
        setJournals(journalsData)

        const [koreaResponse, newsResponse] = await Promise.all([
          fetch('/api/market/korea', { cache: 'no-store' }),
          fetch('/api/market/us-news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              holdings: journalsData
                .filter((journal) => looksLikeUsTicker(journal.ticker))
                .map((journal) => ({
                  ticker: journal.ticker.toUpperCase(),
                  companyName: journal.company_name,
                })),
            }),
          }),
        ])

        if (!koreaResponse.ok || !newsResponse.ok) {
          throw new Error('오늘 시장 데이터를 불러오지 못했습니다.')
        }

        const koreaPayload = (await koreaResponse.json()) as { market: KoreaMarketSnapshot }
        const newsPayload = (await newsResponse.json()) as { news: UsNewsPayload }

        setKorea(koreaPayload.market ?? null)
        setHeadlines(newsPayload.news?.headlines ?? [])
        setRelatedNews(newsPayload.news?.related ?? [])
        await loadAiBrief()
      } catch (err: any) {
        console.error('[v0] Market page load error:', err)
        setError(err?.message || '오늘 시장 데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6 sm:py-8 sm:space-y-8">
        <TodayMarketHub
          korea={korea}
          headlines={headlines}
          relatedNews={relatedNews}
          loading={loading}
          error={error}
        />

        {!loading && !error ? (
          <AiMarketBrief
            brief={aiBrief}
            loading={aiLoading}
            error={aiError}
            onRefresh={loadAiBrief}
          />
        ) : null}

        {!loading && !error && usHoldings.length > 0 ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold text-foreground">연결 중인 미국 종목</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              현재 뉴스 연관 매칭에 사용 중인 미국 보유 종목 목록입니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {usHoldings.map((holding) => (
                <span
                  key={holding.ticker}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground"
                >
                  {holding.companyName} · {holding.ticker}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
