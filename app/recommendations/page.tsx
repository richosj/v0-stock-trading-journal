'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/trading/header'
import { AiMarketBrief } from '@/components/trading/ai-market-brief'
import type { DailyAiBrief } from '@/lib/gemini-brief-types'
import { Bot, Briefcase, Sparkles, Target, TrendingUp } from 'lucide-react'

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
        <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-6 shadow-md">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-profit/10 blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              AI + 내 일지 기반
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              추천 종목
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              뻔한 대형주는 줄이고, 오늘 시장 흐름과 내 매매 기록을 반영해 카드로 정리합니다.
              보유 종목이 많으면 슬라이드로 넘겨 확인하세요.
            </p>

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
          </div>
        </section>

        <AiMarketBrief brief={brief} loading={loading} error={error} onRefresh={loadBrief} />
      </main>
    </div>
  )
}
