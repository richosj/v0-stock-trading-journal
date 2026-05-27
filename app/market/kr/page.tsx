'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/trading/header'
import { KoreaMarketHub } from '@/components/trading/today-market-hub'
import type { KoreaMarketSnapshot } from '@/lib/market-feed'

export default function KoreaMarketPage() {
  const [korea, setKorea] = useState<KoreaMarketSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/market/korea', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('오늘의 국장 데이터를 불러오지 못했습니다.')
        }
        const payload = (await response.json()) as { market: KoreaMarketSnapshot }
        setKorea(payload.market ?? null)
      } catch (err: any) {
        setError(err?.message || '오늘의 국장 데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto space-y-6 px-4 py-6 sm:space-y-8 sm:py-8">
        <KoreaMarketHub korea={korea} loading={loading} error={error} />
      </main>
    </div>
  )
}

