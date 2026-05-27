"use client"

import Link from "next/link"
import { useState } from "react"
import { Flame, Sparkles, TrendingUp, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  formatCurrency,
  formatSignedPercent,
} from "@/lib/trading-calculations"
import type { KoreaMarketCardItem, KoreaMarketSnapshot, UsNewsItem } from "@/lib/market-feed"
import { formatMarketTimestamp, getNaverStockLogoUrl } from "@/lib/market-feed"
import { MarketNewsFeed, MarketNewsFeedSkeleton } from "@/components/trading/market-news-feed"

export function formatPublishedAt(value: string | null) {
  return formatMarketTimestamp(value)
}

type TodayMarketHubProps = {
  korea: KoreaMarketSnapshot | null
  headlines: UsNewsItem[]
  relatedNews: UsNewsItem[]
  loading: boolean
  error: string | null
}

function StockLogo({ code, name }: { code: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const initial = name.trim().slice(0, 1) || "?"

  if (failed) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-bold text-primary">
        {initial}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getNaverStockLogoUrl(code)}
      alt=""
      className="h-11 w-11 shrink-0 rounded-xl border border-border/60 bg-background object-contain p-1"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function rankBadgeClass(rank: number) {
  if (rank === 1) return "bg-amber-500/15 text-amber-600 dark:text-amber-400"
  if (rank === 2) return "bg-slate-400/15 text-slate-600 dark:text-slate-300"
  if (rank === 3) return "bg-orange-700/15 text-orange-700 dark:text-orange-400"
  return "bg-secondary text-muted-foreground"
}

function MarketCard({
  title,
  helper,
  items,
}: {
  title: string
  helper: string
  items: KoreaMarketCardItem[]
}) {
  const accent =
    title.includes("급등") ? "text-profit" : title.includes("거래") ? "text-primary" : "text-foreground"

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={cn("text-lg font-semibold", accent)}>{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-2">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {items.length > 0 ? (
          items.map((item) => {
            const positive = (item.changePercent ?? 0) >= 0
            const absChange = Math.abs(item.changePercent ?? 0)
            const intensityClass =
              absChange >= 10 ? "opacity-100" : absChange >= 5 ? "opacity-80" : absChange >= 2 ? "opacity-60" : "opacity-40"

            return (
              <Link
                key={`${title}-${item.code}`}
                href={item.detailUrl}
                target="_blank"
                rel="noreferrer"
                className="group block overflow-hidden rounded-xl border border-border bg-background transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div
                  className={cn(
                    "h-0.5 w-full",
                    positive ? "bg-profit" : "bg-loss",
                    intensityClass
                  )}
                />
                <div className="flex items-center gap-3 px-3 py-3">
                  <StockLogo code={item.code} name={item.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-bold",
                          rankBadgeClass(item.rank)
                        )}
                      >
                        {item.rank}위
                      </span>
                      <p className="truncate font-semibold text-foreground group-hover:text-primary">
                        {item.name}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs font-mono text-muted-foreground">{item.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      {item.price != null ? formatCurrency(item.price) : "-"}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs font-semibold",
                        positive ? "text-profit" : "text-loss"
                      )}
                    >
                      {item.changePercent != null ? formatSignedPercent(item.changePercent, 2) : "-"}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })
        ) : (
          <div className="rounded-xl bg-secondary/20 p-4 text-sm text-muted-foreground">
            현재 불러올 수 있는 데이터가 없습니다.
          </div>
        )}
      </div>
    </section>
  )
}

function KoreaMarketSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-44 rounded-2xl bg-secondary/40" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 w-40 shrink-0 rounded-xl bg-secondary/40" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 rounded-2xl bg-secondary/30" />
        <div className="h-80 rounded-2xl bg-secondary/30" />
      </div>
    </div>
  )
}

function GainersStrip({ items }: { items: KoreaMarketCardItem[] }) {
  if (items.length === 0) return null

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-500" />
        <h2 className="text-sm font-semibold text-foreground">오늘의 급등 흐름</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
        {items.slice(0, 8).map((item) => (
          <Link
            key={item.code}
            href={item.detailUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-[140px] shrink-0 flex-col rounded-xl border border-border bg-background p-3 transition-colors hover:border-profit/40 hover:bg-profit/5"
          >
            <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
            <p className="mt-1 text-lg font-bold text-profit">
              {item.changePercent != null ? formatSignedPercent(item.changePercent, 2) : "-"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{item.rank}위 · 급등</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function KoreaMarketHub({
  korea,
  loading,
  error,
}: {
  korea: KoreaMarketSnapshot | null
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return <KoreaMarketSkeleton />
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm font-medium text-loss">오류: {error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          국장 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">오늘의 국장</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              네이버증권 기준 인기/급등/거래상위를 한 화면에서 빠르게 훑어봅니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              KRX 흐름 요약
            </span>
            <span className="rounded-full bg-secondary px-3 py-1">
              {korea?.fetchedAt ? `${formatPublishedAt(korea.fetchedAt)} 기준` : "방금 전 기준"}
            </span>
          </div>
        </div>

        <div className="relative mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" /> 인기 검색
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{korea?.popular[0]?.name ?? "-"}</p>
            <p className="mt-1 text-xs text-muted-foreground">관심이 몰리는 종목</p>
          </div>
          <div className="rounded-xl border border-profit/20 bg-profit/5 p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-profit" /> 급등 선두
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{korea?.gainers[0]?.name ?? "-"}</p>
            <p className="mt-1 text-xs font-semibold text-profit">
              {korea?.gainers[0]?.changePercent != null
                ? formatSignedPercent(korea.gainers[0].changePercent, 2)
                : "-"}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">거래상위 선두</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{korea?.active[0]?.name ?? "-"}</p>
            <p className="mt-1 text-xs text-muted-foreground">수급이 붙는 종목</p>
          </div>
        </div>
      </section>

      <GainersStrip items={korea?.gainers ?? []} />

      <div className="grid gap-6 xl:grid-cols-2">
        <MarketCard title="인기" helper="검색 상위 종목을 빠르게 훑어봅니다." items={korea?.popular ?? []} />
        <MarketCard title="급등" helper="상승률 상위 종목 중심으로 흐름을 확인합니다." items={korea?.gainers ?? []} />
      </div>

      <MarketCard
        title="거래상위"
        helper="거래대금/거래량이 몰리는 종목 흐름을 살펴봅니다."
        items={korea?.active ?? []}
      />
    </div>
  )
}

export function UsMarketHub({
  headlines,
  relatedNews,
  loading,
  error,
}: {
  headlines: UsNewsItem[]
  relatedNews: UsNewsItem[]
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-2xl bg-secondary/40" />
        <MarketNewsFeedSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm font-medium text-loss">오류: {error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          미장 뉴스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">오늘의 미장</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Investing.com 헤드라인을 “한줄 해석”으로 빠르게 이해하고, 보유 종목 연관 뉴스만 따로 모읍니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              US 뉴스 요약
            </span>
            <span className="rounded-full bg-secondary px-3 py-1">헤드라인 + 보유 연관</span>
          </div>
        </div>
      </section>

      <MarketNewsFeed
        title="미국 시장 뉴스"
        helper="썸네일·한줄 해석과 함께 최신 헤드라인을 넉넉히 모았습니다."
        items={headlines}
        emptyMessage="현재 표시할 미국 시장 뉴스가 없습니다."
        variant="headlines"
      />

      <MarketNewsFeed
        title="보유 종목 연관 뉴스"
        helper="내 보유 미국 종목과 연결된 기사만 따로 골라봅니다."
        items={relatedNews}
        emptyMessage="현재 보유 종목과 직접 연결된 미국 뉴스가 없습니다."
        variant="related"
      />
    </div>
  )
}

export function TodayMarketHub({
  korea,
  headlines,
  relatedNews,
  loading,
  error,
}: TodayMarketHubProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        오늘 시장 데이터를 불러오는 중...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm font-medium text-loss">오류: {error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          외부 시장 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">오늘 시장</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              국내 인기종목 흐름과 미국 시장 뉴스를 메인 대시보드와 분리해서 한 번에 확인하세요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              외부 시장 허브
            </span>
            <span className="rounded-full bg-secondary px-3 py-1">
              한국 시장 + 미국 뉴스
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-secondary/25 p-4">
            <p className="text-xs text-muted-foreground">인기 검색</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {korea?.popular[0]?.name ?? "-"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              네이버증권 검색 상위 흐름
            </p>
          </div>
          <div className="rounded-xl bg-secondary/25 p-4">
            <p className="text-xs text-muted-foreground">급등 선두</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {korea?.gainers[0]?.name ?? "-"}
            </p>
            <p className="mt-1 text-xs text-profit">
              {korea?.gainers[0]?.changePercent != null
                ? formatSignedPercent(korea.gainers[0].changePercent, 2)
                : "-"}
            </p>
          </div>
          <div className="rounded-xl bg-secondary/25 p-4">
            <p className="text-xs text-muted-foreground">거래상위 선두</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {korea?.active[0]?.name ?? "-"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {korea?.fetchedAt ? formatPublishedAt(korea.fetchedAt) : "방금 전"} 기준
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <MarketCard
              title="한국 시장 인기"
              helper="네이버증권 검색 상위 종목을 빠르게 훑어봅니다."
              items={korea?.popular ?? []}
            />
            <MarketCard
              title="한국 시장 급등"
              helper="상승률 상위 종목 중심으로 오늘 강한 흐름을 확인합니다."
              items={korea?.gainers ?? []}
            />
          </div>

          <MarketCard
            title="한국 시장 거래상위"
            helper="거래대금/거래량이 몰리는 종목 흐름을 살펴봅니다."
            items={korea?.active ?? []}
          />
        </div>

        <div className="space-y-6">
          <MarketNewsFeed
            title="미국 시장 뉴스"
            helper="썸네일·한줄 해석과 함께 최신 헤드라인을 확인합니다."
            items={headlines}
            emptyMessage="현재 표시할 미국 시장 뉴스가 없습니다."
            variant="headlines"
          />
          <MarketNewsFeed
            title="보유 종목 연관 뉴스"
            helper="보유 중인 미국 종목과 연결되는 기사만 따로 모았습니다."
            items={relatedNews}
            emptyMessage="현재 보유 종목과 직접 연결된 미국 뉴스가 없습니다."
            variant="related"
          />
        </div>
      </div>
    </div>
  )
}
