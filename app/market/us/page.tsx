'use client'

import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/trading/header'
import { UsMarketHub } from '@/components/trading/today-market-hub'
import { fetchAllJournals } from '@/lib/trading-service'
import type { TradingJournal } from '@/lib/supabase'
import type { UsNewsItem } from '@/lib/market-feed'

type UsNewsPayload = {
  headlines?: UsNewsItem[]
  related?: UsNewsItem[]
}

function looksLikeUsTicker(ticker: string) {
  return /^[A-Za-z][A-Za-z0-9.-]{0,14}$/.test(ticker.trim())
}

export default function UsMarketPage() {
  const [journals, setJournals] = useState<TradingJournal[]>([])
  const [headlines, setHeadlines] = useState<UsNewsItem[]>([])
  const [relatedNews, setRelatedNews] = useState<UsNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const holdingsPayload = useMemo(() => {
    const unique = new Map<string, { ticker: string; companyName: string }>()
    for (const journal of journals) {
      const ticker = journal.ticker.trim().toUpperCase()
      if (!ticker || !looksLikeUsTicker(ticker) || journal.exit_price != null) {
        continue
      }
      if (!unique.has(ticker)) {
        unique.set(ticker, { ticker, companyName: journal.company_name })
      }
    }
    return [...unique.values()]
  }, [journals])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const journalsData = await fetchAllJournals()
        setJournals(journalsData)

        const response = await fetch('/api/market/us-news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ holdings: journalsData.filter((j) => looksLikeUsTicker(j.ticker)).map((j) => ({
            ticker: j.ticker.toUpperCase(),
            companyName: j.company_name,
          })) }),
        })

        if (!response.ok) {
          throw new Error('오늘의 미장 뉴스를 불러오지 못했습니다.')
        }

        const payload = (await response.json()) as { news: UsNewsPayload }
        setHeadlines(payload.news?.headlines ?? [])
        setRelatedNews(payload.news?.related ?? [])
      } catch (err: any) {
        setError(err?.message || '오늘의 미장 뉴스를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto space-y-6 px-4 py-6 sm:space-y-8 sm:py-8">
        <UsMarketHub headlines={headlines} relatedNews={relatedNews} loading={loading} error={error} />

        {!loading && !error && holdingsPayload.length > 0 ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold text-foreground">연결 중인 미국 보유 종목</h2>
            <p className="mt-1 text-sm text-muted-foreground">보유 연관 뉴스 매칭에 사용한 티커 목록입니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {holdingsPayload.map((holding) => (
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

