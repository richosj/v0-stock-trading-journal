'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, List, Plus } from 'lucide-react'
import { Header } from '@/components/trading/header'
import { JournalCalendar } from '@/components/trading/journal-calendar'
import { JournalTable } from '@/components/trading/journal-table'
import { Button } from '@/components/ui/button'
import { fetchAllJournals } from '@/lib/trading-service'
import type { TradingJournal } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import { PageHero } from '@/components/trading/page-hero'
import { cn } from '@/lib/utils'

type JournalTab = 'list' | 'calendar'

export default function JournalPage() {
  const { session } = useAuth()
  const [journals, setJournals] = useState<TradingJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<JournalTab>('list')

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
        <div className="flex h-96 flex-col items-center justify-center gap-2">
          <p className="text-sm font-medium text-loss">오류: {error}</p>
        </div>
      </div>
    )
  }

  const openCount = journals.filter((journal) => journal.exit_price == null).length

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto space-y-6 px-4 py-6 sm:space-y-7 sm:py-8">
        <PageHero
          badge="저널 & 복기"
          title="매매 일지"
          description="목록에서 빠르게 찾고, 달력에서 날짜별 복기 흐름을 확인하세요."
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
                <p className="text-[11px] text-muted-foreground">진행 중</p>
                <p className="mt-1 text-xl font-bold text-warning">{openCount}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/75 px-4 py-3 col-span-2 sm:col-span-1">
                <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  최근 기록일
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {journals[0]?.trade_date
                    ? new Date(journals[0].trade_date).toLocaleDateString('ko-KR')
                    : '-'}
                </p>
              </div>
            </div>
          }
        />

        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab('list')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === 'list'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="h-4 w-4" />
            목록
          </button>
          <button
            type="button"
            onClick={() => setTab('calendar')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === 'calendar'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CalendarDays className="h-4 w-4" />
            달력 복기
          </button>
        </div>

        {tab === 'list' ? (
          <JournalTable journals={journals} canWrite={session?.canWrite ?? false} />
        ) : (
          <JournalCalendar journals={journals} />
        )}
      </main>
    </div>
  )
}
