'use client'

import Link from 'next/link'
import { Header } from '@/components/trading/header'

export default function MarketPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6 sm:py-8 sm:space-y-8">
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">오늘 시장</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              메뉴가 <span className="font-medium text-foreground">오늘의 국장</span> /{" "}
              <span className="font-medium text-foreground">오늘의 미장</span>으로 분리되었습니다.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Link
                href="/market/kr"
                className="group relative overflow-hidden rounded-2xl border border-profit/20 bg-gradient-to-br from-profit/10 to-card p-6 transition-all hover:shadow-lg"
              >
                <p className="text-lg font-bold text-foreground">오늘의 국장 →</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  로고·급등 스트립·인기/거래상위로 국장 흐름을 한눈에 봅니다.
                </p>
              </Link>
              <Link
                href="/market/us"
                className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-6 transition-all hover:shadow-lg"
              >
                <p className="text-lg font-bold text-foreground">오늘의 미장 →</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  썸네일 뉴스 24건+ · 한줄 해석 · 보유 종목 연관 기사까지 확인합니다.
                </p>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
