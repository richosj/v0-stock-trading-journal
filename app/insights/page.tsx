'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import { Header } from '@/components/trading/header'
import { DashboardInsights } from '@/components/trading/dashboard-insights'
import { Button } from '@/components/ui/button'
import { fetchAllJournals } from '@/lib/trading-service'
import type { TradingJournal } from '@/lib/supabase'
import type { LiveQuote } from '@/lib/market-quotes'
import { useAuth } from '@/components/auth-provider'

export default function InsightsPage() {
  const { session } = useAuth()
  const [journals, setJournals] = useState<TradingJournal[]>([])
  const [quotes, setQuotes] = useState<LiveQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadQuotes = useCallback(async (positions: TradingJournal[]) => {
    if (positions.length === 0) {
      setQuotes([])
      return
    }

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: positions.map((position) => ({
            id: position.id,
            ticker: position.ticker,
            company_name: position.company_name,
            entry_price: position.entry_price,
            quantity: position.quantity,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('실시간 시세를 불러오지 못했습니다.')
      }

      const payload = await response.json()
      setQuotes(payload.quotes ?? [])
    } catch (quoteError) {
      console.error('[v0] Insights quote load error:', quoteError)
      setQuotes(
        positions.map((position) => ({
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
          error: '실시간 시세를 불러오지 못했습니다.',
        }))
      )
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const journalsData = await fetchAllJournals()
        setJournals(journalsData)
        await loadQuotes(journalsData.filter((journal) => journal.exit_price == null))
      } catch (err: any) {
        console.error('[v0] Insights load error:', err)
        setError(err?.message || '데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [loadQuotes])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
          데이터 불러오는 중...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-3">
          <p className="text-sm font-medium text-loss">오류: {error}</p>
          <p className="text-xs text-muted-foreground">잠시 후 다시 시도해주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6 sm:py-8 sm:space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">복기 인사이트</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              월별 흐름, 전략 성과, 실수 패턴, 종목별 누적 결과를 한 화면에서 점검하세요.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full gap-2 sm:w-auto">
                <ArrowRight className="h-4 w-4" />
                대시보드로 이동
              </Button>
            </Link>
            {session?.canWrite ? (
              <Link href="/create">
                <Button className="w-full gap-2 sm:w-auto">
                  <Plus className="h-4 w-4" />
                  새 일지 작성
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <DashboardInsights journals={journals} quotes={quotes} />
      </main>
    </div>
  )
}
