"use client"

import { useMemo } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

const DEFAULT_GRID_MAX = 5
const DEFAULT_PAGE_SIZE = 10

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size))
  }
  return pages
}

type BriefCardDeckProps<T> = {
  title: string
  description?: string
  icon: LucideIcon
  items: T[]
  emptyMessage: string
  getKey: (item: T, index: number) => string
  renderCard: (item: T, index: number) => React.ReactNode
  /** 데스크톱 한 줄 카드 개수 (기본 5) */
  desktopColumns?: 4 | 5
  /** 이 개수 이하면 캐러셀 없이 그리드만 */
  gridMax?: number
  /** 캐러셀 페이지당 카드 수 */
  pageSize?: number
}

export function BriefCardDeck<T>({
  title,
  description,
  icon: Icon,
  items,
  emptyMessage,
  getKey,
  renderCard,
  desktopColumns = 5,
  gridMax = DEFAULT_GRID_MAX,
  pageSize = DEFAULT_PAGE_SIZE,
}: BriefCardDeckProps<T>) {
  const gridClass = desktopColumns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-5"
  const pages = useMemo(() => chunk(items, pageSize), [items, pageSize])
  const usePagedCarousel = items.length > gridMax
  const useCompactGrid = items.length > 0 && items.length <= gridMax

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>
            ) : null}
          </div>
        </div>
        {items.length > 0 ? (
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {items.length}개
          </span>
        ) : null}
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-10 text-center">
          <Icon className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : null}

      {useCompactGrid ? (
        <div className={cn("grid grid-cols-2 gap-3", gridClass)}>
          {items.map((item, i) => (
            <div key={getKey(item, i)}>{renderCard(item, i)}</div>
          ))}
        </div>
      ) : null}

      {usePagedCarousel ? (
        <div className="relative">
          <Carousel
            opts={{ align: "start", loop: false }}
            className="w-full"
          >
            <CarouselContent className="-ml-3">
              {pages.map((page, pageIndex) => (
                <CarouselItem key={`page-${pageIndex}`} className="pl-3 basis-full">
                  <div className={cn("grid grid-cols-2 gap-3", gridClass)}>
                    {page.map((item, i) => {
                      const globalIndex = pageIndex * pageSize + i
                      return (
                        <div key={getKey(item, globalIndex)}>{renderCard(item, globalIndex)}</div>
                      )
                    })}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {pages.length > 1 ? (
              <>
                <CarouselPrevious className="left-0 top-1/2 h-9 w-9 -translate-y-1/2 border-border bg-background/95 shadow-md" />
                <CarouselNext className="right-0 top-1/2 h-9 w-9 -translate-y-1/2 border-border bg-background/95 shadow-md" />
              </>
            ) : null}
          </Carousel>
          {pages.length > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {pages.map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30"
                  aria-hidden
                />
              ))}
              <span className="ml-2 text-[11px] text-muted-foreground">
                {pages.length}페이지 · 좌우로 넘기기
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

/** 모바일 전용 가로 스와이프 (4개 이하일 때도 카드가 넓으면 사용) */
export function BriefCardStrip<T>({
  title,
  description,
  icon: Icon,
  items,
  emptyMessage,
  getKey,
  renderCard,
  className,
}: BriefCardDeckProps<T> & { className?: string }) {
  if (items.length === 0) {
    return (
      <section className={cn("rounded-2xl border border-border bg-card p-4", className)}>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className={cn("md:hidden", className)}>
      <header className="mb-3 flex items-center gap-2 px-1">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </header>
      {description ? (
        <p className="mb-3 px-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <Carousel opts={{ align: "start", dragFree: true }} className="px-1">
        <CarouselContent className="-ml-2">
          {items.map((item, i) => (
            <CarouselItem
              key={getKey(item, i)}
              className="basis-[88%] pl-2 sm:basis-[calc(50%-0.25rem)]"
            >
              {renderCard(item, i)}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">← 밀어서 더 보기</p>
    </section>
  )
}
