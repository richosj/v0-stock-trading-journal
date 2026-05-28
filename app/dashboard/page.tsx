'use client'

import { Header } from '@/components/trading/header'
import { OverviewCards } from '@/components/trading/overview-cards'
import { useEffect, useState } from 'react'
import { fetchAllJournals, getJournalStats } from '@/lib/trading-service'
import type { TradingJournal } from '@/lib/supabase'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Activity, LineChart, Plus } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { PageHero } from '@/components/trading/page-hero'

export default function DashboardPage() {
  const { session } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [journals, setJournals] = useState<TradingJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const openPositions = journals.filter((journal) => journal.exit_price == null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const journalsData = await fetchAllJournals()
        const statsData = await getJournalStats()
        setJournals(journalsData)
        setStats(statsData)
      } catch (err: any) {
        console.error('[v0] Dashboard load error:', err)
        setError(err?.message || '데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

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
        <PageHero
          badge="트레이딩 컨트롤 센터"
          title="대시보드"
          description="손익 요약과 핵심 지표를 확인하세요. 실시간 보유 종목은 전용 메뉴에서 봅니다."
          rightSlot={
            session?.canWrite ? (
              <Link href="/create">
                <Button className="w-full gap-2 sm:w-auto">
                  <Plus className="h-4 w-4" />
                  새 일지 작성
                </Button>
              </Link>
            ) : (
              <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                마스터 계정은 조회만 가능합니다.
              </div>
            )
          }
          stats={
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-background/75 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">총 거래</p>
                <p className="mt-1 text-xl font-bold">{journals.length}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/75 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">진행 중</p>
                <p className="mt-1 text-xl font-bold">{openPositions.length}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/75 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">원칙 비율</p>
                <p className="mt-1 text-xl font-bold">{stats?.principleRate ?? 0}%</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/75 px-4 py-3">
                <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <LineChart className="h-3 w-3" />
                  누적 손익
                </p>
                <p className="mt-1 text-xl font-bold">{(stats?.totalPnL ?? 0).toLocaleString('ko-KR')}원</p>
              </div>
            </div>
          }
        />

        <section aria-label="대시보드 요약">
          <OverviewCards stats={stats} totalTrades={journals.length} />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Link
            href="/holdings"
            className="group rounded-xl border border-primary/25 bg-primary/5 p-6 transition-colors hover:bg-primary/10"
          >
            <div className="mb-2 inline-flex items-center gap-2 text-primary">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">라이브</span>
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              실시간 보유 종목
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              보유 {openPositions.length}종목 시세·평가손익. 모바일에서는 카드를 넘겨 확인하세요.
            </p>
          </Link>
          <Link
            href="/insights"
            className="p-6 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors group"
          >
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              복기 인사이트
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              월별 흐름, 전략 성과, 실수 패턴을 별도 화면에서 집중해서 확인하세요.
            </p>
          </Link>
          <Link
            href="/journal"
            className="p-6 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors group"
          >
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              매매 일지 목록
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              모든 매매 일지를 확인하고 관리하세요.
            </p>
          </Link>
        </section>
      </main>
    </div>
  )
}
