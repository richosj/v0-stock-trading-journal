'use client'

import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/trading/header'
import { TodayMarketHub } from '@/components/trading/today-market-hub'
import { fetchAllJournals } from '@/lib/trading-service'
import type { TradingJournal } from '@/lib/supabase'
import type { KoreaMarketSnapshot, UsNewsItem } from '@/lib/market-feed'

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
