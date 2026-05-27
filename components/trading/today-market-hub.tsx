"use client"

import Link from "next/link"
import { ArrowUpRight, Newspaper, Sparkles, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  formatCurrency,
  formatSignedPercent,
} from "@/lib/trading-calculations"
import type { KoreaMarketCardItem, KoreaMarketSnapshot, UsNewsItem } from "@/lib/market-feed"

type TodayMarketHubProps = {
  korea: KoreaMarketSnapshot | null
  headlines: UsNewsItem[]
  relatedNews: UsNewsItem[]
  loading: boolean
  error: string | null
}

function formatPublishedAt(value: string | null) {
  if (!value) {
    return "방금 전"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
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
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
        </div>
        <TrendingUp className="h-5 w-5 text-primary" />
      </div>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={`${title}-${item.code}`}
              href={item.detailUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {item.rank}위
                    </span>
                    <p className="truncate font-medium text-foreground">{item.name}</p>
                  </div>
                  <p className="mt-1 text-xs font-mono text-muted-foreground">{item.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {item.price != null ? formatCurrency(item.price) : "-"}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs font-medium",
                      (item.changePercent ?? 0) >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {item.changePercent != null ? formatSignedPercent(item.changePercent, 2) : "-"}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-xl bg-secondary/20 p-4 text-sm text-muted-foreground">
            현재 불러올 수 있는 데이터가 없습니다.
          </div>
        )}
      </div>
    </section>
  )
}

function NewsCard({
  title,
  helper,
  items,
  emptyMessage,
}: {
  title: string
  helper: string
  items: UsNewsItem[]
  emptyMessage: string
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
        </div>
        <Newspaper className="h-5 w-5 text-primary" />
      </div>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={`${title}-${item.url}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.relatedLabel ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {item.relatedLabel}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatPublishedAt(item.publishedAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6 text-foreground">{item.title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.author ?? "Investing.com"} · 원문 보기
                  </p>
                </div>
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-xl bg-secondary/20 p-4 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
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
          <NewsCard
            title="미국 시장 뉴스"
            helper="Investing.com 최신 헤드라인을 빠르게 확인합니다."
            items={headlines}
            emptyMessage="현재 표시할 미국 시장 뉴스가 없습니다."
          />

          <NewsCard
            title="보유 종목 연관 뉴스"
            helper="보유 중인 미국 종목명과 연결되는 기사만 따로 모았습니다."
            items={relatedNews}
            emptyMessage="현재 보유 종목과 직접 연결된 미국 뉴스가 없습니다."
          />
        </div>
      </div>
    </div>
  )
}
