'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Activity, Radio } from 'lucide-react'
import { Header } from '@/components/trading/header'
import { LivePricePanel } from '@/components/trading/live-price-panel'
import { fetchAllJournals } from '@/lib/trading-service'
import type { TradingJournal } from '@/lib/supabase'
import type { LiveQuote } from '@/lib/market-quotes'
import { cn } from '@/lib/utils'

export default function HoldingsPage() {
  const [journals, setJournals] = useState<TradingJournal[]>([])
  const [quotes, setQuotes] = useState<LiveQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [quotesLoading, setQuotesLoading] = useState(false)
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '실시간 시세를 불러오지 못했습니다.'
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
          error: message,
        }))
      )
    } finally {
      setQuotesLoading(false)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAllJournals()
        setJournals(data)
        const open = data.filter((journal) => journal.exit_price == null)
        await loadQuotes(open)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [loadQuotes])

  const liveCount = quotes.filter((q) => q.regularMarketPrice != null).length
  const offlineCount = Math.max(0, openPositions.length - liveCount)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:space-y-8 sm:py-8">
        <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/[0.08] via-card to-card px-6 py-7 shadow-sm sm:px-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Radio className="h-3.5 w-3.5" />
              실시간 포트폴리오
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              보유 종목
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              시세·손익을 한눈에 확인하세요. 넓은 화면에서는 한 줄에 4개, 모바일에서는 카드를 넘겨 봅니다.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatChip label="보유" value={String(openPositions.length)} />
              <StatChip label="실시간" value={String(liveCount)} accent />
              <StatChip label="미연동" value={String(offlineCount)} />
              <StatChip
                label="상태"
                value={quotesLoading ? '갱신 중' : liveCount > 0 ? '정상' : '—'}
                icon={<Activity className={cn('h-3.5 w-3.5', quotesLoading && 'animate-pulse')} />}
              />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="h-36 animate-pulse rounded-3xl bg-muted/50" />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl bg-muted/40" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-loss/30 bg-loss-muted/30 p-6">
            <p className="text-sm font-medium text-loss">{error}</p>
          </div>
        ) : (
          <LivePricePanel
            positions={openPositions}
            quotes={quotes}
            loading={quotesLoading}
            onRefresh={() => loadQuotes(openPositions)}
            variant="page"
          />
        )}
      </main>
    </div>
  )
}

function StatChip({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: string
  accent?: boolean
  icon?: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 backdrop-blur-sm',
        accent
          ? 'border-primary/25 bg-primary/5'
          : 'border-border/70 bg-background/70'
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 flex items-center gap-1.5 text-lg font-bold tabular-nums',
          accent ? 'text-primary' : 'text-foreground'
        )}
      >
        {icon}
        {value}
      </p>
    </div>
  )
}
