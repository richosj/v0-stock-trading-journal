"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowUpRight, Clock3, Newspaper, Sparkles, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UsNewsItem } from "@/lib/market-feed"
import { formatMarketTimestamp } from "@/lib/market-feed"

function NewsThumbnail({
  imageUrl,
  title,
  className,
  large,
}: {
  imageUrl: string | null
  title: string
  className?: string
  large?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const showImage = imageUrl && !failed

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-secondary to-secondary/60",
        large ? "h-full min-h-[180px] w-full" : "h-20 w-20 sm:h-24 sm:w-28",
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-2">
          <Newspaper
            className={cn("text-primary/50", large ? "h-12 w-12" : "h-8 w-8")}
            aria-hidden
          />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
    </div>
  )
}

function FeaturedNewsCard({ item }: { item: UsNewsItem }) {
  const keywords = extractHeadlineKeywords(item.title)

  return (
    <Link
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[200px_minmax(0,1fr)]">
        <NewsThumbnail
          imageUrl={item.imageUrl}
          title={item.title}
          large
          className="min-h-[140px] md:min-h-[156px]"
        />
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                <Sparkles className="h-3 w-3" />
                주요 헤드라인
              </span>
              {item.relatedLabel ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                  <Tag className="h-3 w-3" />
                  {item.relatedLabel}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {formatMarketTimestamp(item.publishedAt)}
              </span>
            </div>
            <h3 className="mt-3 line-clamp-2 text-lg font-bold leading-snug text-foreground group-hover:text-primary sm:text-xl">
              {item.title}
            </h3>
            <p className="mt-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm leading-6 text-foreground/90">
              <span className="font-semibold text-primary">한줄 해석</span> · {item.koreanSummary}
            </p>
            {keywords.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {keywords.map((keyword) => (
                  <span
                    key={`${item.url}-${keyword}`}
                    className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    #{keyword}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
            {item.author ?? "Investing.com"} · 원문 보기
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </p>
        </div>
      </div>
    </Link>
  )
}

function NewsListCard({ item, compact }: { item: UsNewsItem; compact?: boolean }) {
  const keywords = extractHeadlineKeywords(item.title)

  return (
    <Link
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group flex gap-3 rounded-xl border border-border bg-background/85 p-3.5 transition-all hover:border-primary/25 hover:bg-secondary/15 hover:shadow-sm",
        compact && "p-2.5"
      )}
    >
      <NewsThumbnail imageUrl={item.imageUrl} title={item.title} className="h-20 w-24 sm:h-20 sm:w-24" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.relatedLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Tag className="h-2.5 w-2.5" />
              {item.relatedLabel}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock3 className="h-3 w-3" />
            {formatMarketTimestamp(item.publishedAt)}
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-5 text-foreground group-hover:text-primary">
          {item.title}
        </p>
        <p className="mt-1.5 line-clamp-3 rounded-md bg-primary/5 px-2 py-1.5 text-xs leading-5 text-foreground/90">
          {item.koreanSummary}
        </p>
        {keywords.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {keywords.slice(0, 2).map((keyword) => (
              <span
                key={`${item.url}-${keyword}`}
                className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                #{keyword}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

export function MarketNewsFeed({
  title,
  helper,
  items,
  emptyMessage,
  variant = "headlines",
}: {
  title: string
  helper: string
  items: UsNewsItem[]
  emptyMessage: string
  variant?: "headlines" | "related"
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <Newspaper className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      </section>
    )
  }

  const featured =
    items.find((item) => item.imageUrl) ?? items[0]
  const rest = items.filter((item) => item.url !== featured.url)

  if (variant === "related") {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {items.length}건
          </span>
        </header>
        <NewsMasonry items={items} />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
        </div>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          총 {items.length}건
        </span>
      </header>

      <FeaturedNewsCard item={featured} />

      <NewsMasonry items={rest} />
    </section>
  )
}

function extractHeadlineKeywords(title: string) {
  const dictionary: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\bfed\b|interest|rate|inflation|cpi/i, label: "거시경제" },
    { pattern: /earnings|guidance|revenue|profit|forecast/i, label: "실적" },
    { pattern: /ai|chip|semiconductor|nvidia/i, label: "AI/반도체" },
    { pattern: /oil|energy|gas|crude/i, label: "에너지" },
    { pattern: /tesla|ev|battery/i, label: "전기차" },
    { pattern: /trade|tariff|geopolitical|china/i, label: "정책/지정학" },
    { pattern: /upgrade|downgrade|target/i, label: "리포트" },
    { pattern: /merger|acquisition|deal/i, label: "M&A" },
  ]

  return dictionary
    .filter((entry) => entry.pattern.test(title))
    .map((entry) => entry.label)
    .slice(0, 3)
}

function NewsMasonry({ items }: { items: UsNewsItem[] }) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <NewsListCard key={item.url} item={item} />
      ))}
    </div>
  )
}

export function MarketNewsFeedSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-secondary/50" />
      <div className="h-56 rounded-2xl bg-secondary/40" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-xl border border-border p-3">
            <div className="h-20 w-24 rounded-xl bg-secondary/50" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 w-16 rounded bg-secondary/50" />
              <div className="h-4 w-full rounded bg-secondary/50" />
              <div className="h-3 w-4/5 rounded bg-secondary/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
