'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Header } from '@/components/trading/header'
import type { CryptoNewsItem } from '@/lib/crypto-news'

type CryptoNewsPayload = {
  items?: CryptoNewsItem[]
  fetchedAt?: string
}

const PAGE_SIZE = 12

const COIN_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'ada', label: '에이다 (ADA)' },
  { id: 'sol', label: '솔라나 (SOL)' },
  { id: 'near', label: '니어 (NEAR)' },
] as const

type CoinFilter = (typeof COIN_FILTERS)[number]['id']

function formatTime(value: string | null) {
  if (!value) return '시간 정보 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function matchesCoinFilter(item: CryptoNewsItem, filter: CoinFilter) {
  if (filter === 'all') return true
  const text = `${item.title} ${item.koreanSummary}`.toLowerCase()
  if (filter === 'ada') return /\bada\b|cardano|에이다|카르다노/.test(text)
  if (filter === 'sol') return /\bsol\b|solana|솔라나/.test(text)
  if (filter === 'near') return /\bnear\b|near protocol|니어/.test(text)
  return true
}

function countByFilter(items: CryptoNewsItem[], filter: Exclude<CoinFilter, 'all'>) {
  return items.filter((item) => matchesCoinFilter(item, filter)).length
}

export default function CryptoMarketNewsPage() {
  const [items, setItems] = useState<CryptoNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [filter, setFilter] = useState<CoinFilter>('all')
  const [page, setPage] = useState(1)

  const loadNews = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/market/crypto-news', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('코인 뉴스를 불러오지 못했습니다.')
      }
      const payload = (await response.json()) as CryptoNewsPayload
      setItems(payload.items ?? [])
      setFetchedAt(payload.fetchedAt ?? null)
    } catch (err: any) {
      setError(err?.message || '코인 뉴스를 불러오지 못했습니다.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNews()
  }, [])

  const filteredItems = items.filter((item) => matchesCoinFilter(item, filter))
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const pageWindowStart = Math.max(1, safePage - 2)
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + 4)
  const pageNumbers = Array.from({ length: pageWindowEnd - pageWindowStart + 1 }, (_, i) => pageWindowStart + i)

  const adaCount = countByFilter(items, 'ada')
  const solCount = countByFilter(items, 'sol')
  const nearCount = countByFilter(items, 'near')

  useEffect(() => {
    setPage(1)
  }, [filter, items.length])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto space-y-6 px-4 py-6 sm:space-y-8 sm:py-8">
        <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">코인 뉴스</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                CoinDesk · Cointelegraph 주요 기사를 시간순으로 모아봤습니다.
              </p>
              {fetchedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">마지막 업데이트: {formatTime(fetchedAt)}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={loadNews}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              새로고침
            </button>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setFilter('ada')}
              className="rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <p className="text-[11px] text-muted-foreground">에이다 (ADA)</p>
              <p className="mt-1 text-base font-bold text-foreground">{adaCount}건</p>
            </button>
            <button
              type="button"
              onClick={() => setFilter('sol')}
              className="rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <p className="text-[11px] text-muted-foreground">솔라나 (SOL)</p>
              <p className="mt-1 text-base font-bold text-foreground">{solCount}건</p>
            </button>
            <button
              type="button"
              onClick={() => setFilter('near')}
              className="rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <p className="text-[11px] text-muted-foreground">니어 (NEAR)</p>
              <p className="mt-1 text-base font-bold text-foreground">{nearCount}건</p>
            </button>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-loss/30 bg-loss/5 p-5 text-sm text-loss">
            {error}
          </section>
        ) : null}

        {!error ? (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {COIN_FILTERS.map((coin) => (
                <button
                  key={coin.id}
                  type="button"
                  onClick={() => setFilter(coin.id)}
                  className={
                    filter === coin.id
                      ? 'rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary'
                      : 'rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground'
                  }
                >
                  {coin.label}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">코인 뉴스 로딩 중...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">표시할 코인 뉴스가 없습니다.</p>
            ) : (
              <>
                <ul className="grid gap-3 md:grid-cols-2">
                  {pageItems.map((item) => (
                  <li key={`${item.url}-${item.publishedAt ?? 'none'}`}>
                    <Link
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex h-full items-start justify-between gap-3 rounded-xl border border-border bg-background p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-secondary/30"
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
                          {item.title}
                        </p>
                        <p className="mt-2 line-clamp-2 rounded-lg bg-secondary/40 px-2 py-1.5 text-xs text-foreground/85">
                          {item.koreanSummary}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.source} · {formatTime(item.publishedAt)}
                        </p>
                      </div>
                      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                  ))}
                </ul>

                <div className="mt-5 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {filteredItems.length}건 중 {(safePage - 1) * PAGE_SIZE + 1}-
                    {Math.min(safePage * PAGE_SIZE, filteredItems.length)} 표시
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-40"
                    >
                      이전
                    </button>
                    {pageNumbers.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        className={
                          n === safePage
                            ? 'rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary'
                            : 'rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground'
                        }
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-40"
                    >
                      다음
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        ) : null}
      </main>
    </div>
  )
}
