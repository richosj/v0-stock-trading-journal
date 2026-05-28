'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/trading/header'
import { AiMarketBrief } from '@/components/trading/ai-market-brief'
import type { DailyAiBrief } from '@/lib/gemini-brief-types'
import { Bot, Briefcase, Target, TrendingUp } from 'lucide-react'
import { PageHero } from '@/components/trading/page-hero'

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
        <PageHero
          badge="AI + 내 일지 기반"
          title="추천 종목"
          description="뻔한 대형주는 줄이고, 오늘 시장 흐름과 내 매매 기록을 반영한 추천을 카드로 확인하세요."
          stats={
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-background/70 px-3 py-3 backdrop-blur-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">주목 종목</p>
                  <p className="text-lg font-bold text-foreground">
                    {loading ? '—' : (brief?.watchlist.length ?? 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-background/70 px-3 py-3 backdrop-blur-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-profit/10">
                  <Briefcase className="h-4 w-4 text-profit" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">보유 메모</p>
                  <p className="text-lg font-bold text-foreground">
                    {loading ? '—' : (brief?.holdingsNotes.length ?? 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-background/70 px-3 py-3 backdrop-blur-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <TrendingUp className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">시장 심리</p>
                  <p className="text-sm font-bold text-foreground">
                    {loading || !brief
                      ? '—'
                      : brief.marketMood === 'risk-on'
                        ? '위험 선호'
                        : brief.marketMood === 'risk-off'
                          ? '위험 회피'
                          : '혼조'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-background/70 px-3 py-3 backdrop-blur-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <Bot className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">브리핑</p>
                  <p className="text-sm font-bold text-foreground">
                    {loading ? '…' : brief?.source === 'gemini' ? 'AI' : '데이터'}
                  </p>
                </div>
              </div>
            </div>
          }
        />

        <AiMarketBrief brief={brief} loading={loading} error={error} onRefresh={loadBrief} />
      </main>
    </div>
  )
}
