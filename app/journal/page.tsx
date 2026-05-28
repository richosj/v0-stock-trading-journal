'use client'

import { Header } from '@/components/trading/header'
import { JournalCalendar } from '@/components/trading/journal-calendar'
import { JournalTable } from '@/components/trading/journal-table'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { fetchAllJournals } from '@/lib/trading-service'
import type { TradingJournal } from '@/lib/supabase'
import Link from 'next/link'
import { CalendarDays, Plus } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { PageHero } from '@/components/trading/page-hero'

export default function JournalPage() {
  const { session } = useAuth()
  const [journals, setJournals] = useState<TradingJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadJournals = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAllJournals()
        setJournals(data)
      } catch (err: any) {
        console.error('[v0] Journal list error:', err)
        setError(err?.message || '데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadJournals()
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
        <div className="flex flex-col items-center justify-center h-96 gap-2">
          <p className="text-loss text-sm font-medium">오류: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6 sm:py-8 sm:space-y-7">
        <PageHero
          badge="저널 & 복기"
          title="매매 일지 목록"
          description={`${journals.length}개의 매매 기록과 달력 복기를 한 번에 확인하세요.`}
          rightSlot={
            session?.canWrite ? (
              <Link href="/create">
                <Button className="w-full gap-2 sm:w-auto">
                  <Plus className="h-4 w-4" />
                  새 일지 작성
                </Button>
              </Link>
            ) : null
          }
          stats={
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-background/75 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">총 기록</p>
                <p className="mt-1 text-xl font-bold">{journals.length}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/75 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">진행 중 포지션</p>
                <p className="mt-1 text-xl font-bold">
                  {journals.filter((journal) => journal.exit_price == null).length}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/75 px-4 py-3">
                <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  마지막 기록일
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {journals[0]?.trade_date ? new Date(journals[0].trade_date).toLocaleDateString('ko-KR') : '-'}
                </p>
              </div>
            </div>
          }
        />

        <JournalCalendar journals={journals} />

        <JournalTable journals={journals} canWrite={session?.canWrite ?? false} />
      </main>
    </div>
  )
}
