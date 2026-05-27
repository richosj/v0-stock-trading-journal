'use client'

import { Header } from '@/components/trading/header'
import { OverviewCards } from '@/components/trading/overview-cards'
import { LivePricePanel } from '@/components/trading/live-price-panel'
import { DashboardInsights } from '@/components/trading/dashboard-insights'
import { useCallback, useEffect, useState } from 'react'
import { fetchAllJournals, getJournalStats } from '@/lib/trading-service'
import type { TradingJournal } from '@/lib/supabase'
import type { LiveQuote } from '@/lib/market-quotes'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'

export default function DashboardPage() {
  const { session } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [journals, setJournals] = useState<TradingJournal[]>([])
  const [quotes, setQuotes] = useState<LiveQuote[]>([])
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const openPositions = journals.filter((journal) => journal.exit_price == null)

  const loadQuotes = useCallback(async (positions: TradingJournal[]) => {
    if (positions.length === 0) {
      setQuotes([])
      return
    }

    setQuotesLoading(true)

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
      console.error('[v0] Quote load error:', quoteError)
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
    } finally {
      setQuotesLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const journalsData = await fetchAllJournals()
        const statsData = await getJournalStats()
        setJournals(journalsData)
        setStats(statsData)
        await loadQuotes(journalsData.filter((journal) => journal.exit_price == null))
      } catch (err: any) {
        console.error('[v0] Dashboard load error:', err)
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
        <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">데이터 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center h-96 gap-3">
          <p className="text-loss text-sm font-medium">오류: {error}</p>
          <p className="text-muted-foreground text-xs">환경 변수(SUPABASE URL/KEY)를 확인하세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6 sm:py-8 sm:space-y-8">
        {/* Title */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">대시보드</h1>
            <p className="text-sm text-muted-foreground mt-1">
              뇌동매매 없이, 원칙에 따른 매매를 기록하고 복기하세요.
            </p>
          </div>
          {session?.canWrite ? (
            <Link href="/create">
              <Button className="w-full gap-2 sm:w-auto">
                <Plus className="w-4 h-4" />
                새 일지 작성
              </Button>
            </Link>
          ) : (
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              마스터 계정은 조회만 가능합니다.
            </div>
          )}
        </div>

        {/* Overview Cards */}
        <section aria-label="대시보드 요약">
          <OverviewCards
            stats={stats}
            totalTrades={journals.length}
          />
        </section>

        <LivePricePanel
          positions={openPositions}
          quotes={quotes}
          loading={quotesLoading}
          onRefresh={() => loadQuotes(openPositions)}
        />

        <DashboardInsights journals={journals} quotes={quotes} />

        {/* Quick Links */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/journal"
            className="p-6 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors group"
          >
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              📊 매매 일지 목록
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              모든 매매 일지를 확인하고 관리하세요.
            </p>
          </Link>
          {session?.canWrite ? (
            <Link
              href="/create"
              className="p-6 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors group"
            >
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                ✏️ 새 일지 작성
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                오늘의 매매를 기록하세요.
              </p>
            </Link>
          ) : (
            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="font-semibold text-foreground">👀 조회 전용 모드</h3>
              <p className="text-sm text-muted-foreground mt-2">
                마스터 계정은 전체 기록과 포트폴리오 현황을 확인할 수 있습니다.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
