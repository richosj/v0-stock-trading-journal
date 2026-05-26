'use client'

import { Header } from '@/components/trading/header'
import { OverviewCards } from '@/components/trading/overview-cards'
import { useEffect, useState } from 'react'
import { fetchAllJournals, getJournalStats } from '@/lib/trading-service'
import { TradingJournal } from '@/lib/supabase'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [journals, setJournals] = useState<TradingJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">대시보드</h1>
            <p className="text-sm text-muted-foreground mt-1">
              뇌동매매 없이, 원칙에 따른 매매를 기록하고 복기하세요.
            </p>
          </div>
          <Link href="/create">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              새 일지 작성
            </Button>
          </Link>
        </div>

        {/* Overview Cards */}
        <section aria-label="대시보드 요약">
          <OverviewCards
            stats={stats}
            totalTrades={journals.length}
          />
        </section>

        {/* Quick Links */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </section>
      </main>
    </div>
  )
}
