'use client'

import { Header } from '@/components/trading/header'
import { JournalTable } from '@/components/trading/journal-table'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { fetchAllJournals } from '@/lib/trading-service'
import type { TradingJournal } from '@/lib/supabase'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'

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
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">매매 일지 목록</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {journals.length}개의 매매 기록
            </p>
          </div>
          {session?.canWrite ? (
            <Link href="/create">
              <Button className="w-full gap-2 sm:w-auto">
                <Plus className="w-4 h-4" />
                새 일지 작성
              </Button>
            </Link>
          ) : null}
        </div>
        <JournalTable journals={journals} canWrite={session?.canWrite ?? false} />
      </main>
    </div>
  )
}
