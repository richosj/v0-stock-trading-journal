'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/trading/header'
import { AiMarketBrief } from '@/components/trading/ai-market-brief'
import type { DailyAiBrief } from '@/lib/gemini-brief-types'

export default function RecommendationsPage() {
  const [brief, setBrief] = useState<DailyAiBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBrief = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/daily-brief', { cache: 'no-store' })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || '추천 종목 데이터를 불러오지 못했습니다.')
      }

      const payload = (await response.json()) as { brief: DailyAiBrief }
      setBrief(payload.brief ?? null)
    } catch (err: any) {
      setError(err?.message || '추천 종목 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBrief()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto space-y-6 px-4 py-6 sm:space-y-8 sm:py-8">
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">추천 종목</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              뻔한 대형주/ETF를 최대한 제외하고, 오늘 시장 맥락에서 왜 지금 볼지와 리스크를 함께 보여줍니다.
            </p>
          </div>
        </section>
        <AiMarketBrief brief={brief} loading={loading} error={error} onRefresh={loadBrief} />
      </main>
    </div>
  )
}
