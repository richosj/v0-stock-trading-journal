"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Bot,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Clock,
  Link2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { DailyAiBrief, AiHoldingNote, AiWatchItem } from "@/lib/gemini-brief-types"
import { getNaverStockLogoUrl } from "@/lib/market-feed"
import { BriefCardDeck, BriefCardStrip } from "@/components/trading/brief-card-deck"

type AiMarketBriefProps = {
  brief: DailyAiBrief | null
  loading: boolean
  error: string | null
  onRefresh: () => void
}

const moodLabel: Record<DailyAiBrief["marketMood"], string> = {
  "risk-on": "위험 선호",
  "risk-off": "위험 회피",
  mixed: "혼조",
}

const moodClass: Record<DailyAiBrief["marketMood"], string> = {
  "risk-on": "bg-profit/15 text-profit border-profit/30",
  "risk-off": "bg-loss/15 text-loss border-loss/30",
  mixed: "bg-secondary text-muted-foreground border-border",
}

const moodIcon: Record<DailyAiBrief["marketMood"], typeof TrendingUp> = {
  "risk-on": TrendingUp,
  "risk-off": ShieldAlert,
  mixed: Zap,
}

function isKrCode(ticker: string) {
  return /^\d{5,6}$/.test(ticker.trim())
}

function StockAvatar({ name, ticker }: { name: string; ticker: string }) {
  const [failed, setFailed] = useState(false)
  const initial = name.trim().slice(0, 1) || "?"

  if (ticker && isKrCode(ticker) && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getNaverStockLogoUrl(ticker)}
        alt=""
        className="h-10 w-10 shrink-0 rounded-lg border border-border/60 bg-background object-contain p-1"
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/25 to-primary/5 text-sm font-bold text-primary">
      {initial}
    </div>
  )
}

function WatchlistCard({ item }: { item: AiWatchItem }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-background p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{item.name}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {item.ticker || "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-2.5">
        <div className="rounded-lg bg-primary/5 px-2.5 py-2">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
            <Target className="h-3 w-3" />
            왜 지금?
          </p>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-foreground">{item.reason}</p>
        </div>
        <div className="rounded-lg bg-loss/5 px-2.5 py-2">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-loss">
            <AlertTriangle className="h-3 w-3" />
            리스크
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-loss/90">{item.risk}</p>
        </div>
      </div>

      {item.relation ? (
        <p className="mt-2 flex items-center gap-1 truncate text-[11px] text-primary">
          <Link2 className="h-3 w-3 shrink-0" />
          {item.relation}
        </p>
      ) : null}
    </article>
  )
}

function HoldingNoteCard({ item }: { item: AiHoldingNote }) {
  const [expanded, setExpanded] = useState(false)
  const lines = item.note.split("\n")
  const needsExpand = item.note.length > 120 || lines.length > 4

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-background p-3 shadow-sm sm:p-4">
      <div className="flex items-start gap-2.5">
        <StockAvatar name={item.name} ticker={item.ticker} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{item.name}</p>
          {item.ticker ? (
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{item.ticker}</p>
          ) : null}
        </div>
        <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
      </div>

      <p
        className={cn(
          "mt-3 flex-1 whitespace-pre-line text-xs leading-5 text-foreground/90",
          !expanded && needsExpand && "line-clamp-5"
        )}
      >
        {item.note}
      </p>

      {needsExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              접기
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              메모 더보기
            </>
          )}
        </button>
      ) : null}
    </article>
  )
}

export function AiMarketBrief({ brief, loading, error, onRefresh }: AiMarketBriefProps) {
  const MoodIcon = brief ? moodIcon[brief.marketMood] : Zap

  return (
    <div className="space-y-5">
      {/* 요약 헤더 */}
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {brief?.source === "fallback" ? "시장 데이터 브리핑" : "Gemini AI 브리핑"}
            </div>
            <h2 className="mt-3 text-xl font-bold text-foreground sm:text-2xl">오늘의 추천 브리핑</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              주목 종목 · 보유 메모를 카드로 정리했습니다. 4개 넘으면 슬라이드로 넘겨 보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-background/80 p-5">
            <Bot className="h-5 w-5 animate-pulse text-primary" />
            <p className="text-sm text-muted-foreground">브리핑을 작성하는 중...</p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-xl border border-loss/30 bg-loss/5 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-loss">
              <AlertTriangle className="h-4 w-4" />
              브리핑 오류
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : null}

        {!loading && !error && brief ? (
          <div className="mt-5 space-y-4">
            {brief.notice ? (
              <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-muted-foreground">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                {brief.notice}
              </div>
            ) : null}

            <div className="rounded-xl border border-border bg-background/90 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                    moodClass[brief.marketMood]
                  )}
                >
                  <MoodIcon className="h-3.5 w-3.5" />
                  {moodLabel[brief.marketMood]}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(brief.generatedAt).toLocaleString("ko-KR")}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-foreground">{brief.summary}</p>
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2.5 text-xs text-muted-foreground">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                {brief.caution} (참고용이며 투자 추천이 아닙니다.)
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {!loading && !error && brief ? (
        <>
          {/* 모바일: 가로 스트립 */}
          <BriefCardStrip
            title="오늘 주목 종목"
            icon={Bot}
            items={brief.watchlist}
            emptyMessage="생성된 주목 종목이 없습니다."
            getKey={(item, i) => `${item.ticker}-${item.name}-${i}`}
            renderCard={(item) => <WatchlistCard item={item} />}
          />
          <BriefCardStrip
            title="내 보유 종목 메모"
            description="일지에 적은 메모 원문"
            icon={Briefcase}
            items={brief.holdingsNotes}
            emptyMessage="진행 중인 보유 종목이 없습니다."
            getKey={(item, i) => `${item.ticker}-${item.name}-${i}`}
            renderCard={(item) => <HoldingNoteCard item={item} />}
          />

          {/* 태블릿·PC: 4열 그리드 / 8개 단위 페이지 슬라이드 */}
          <div className="hidden space-y-5 md:block">
            <BriefCardDeck
              title="오늘 주목 종목"
              description="시장·뉴스 맥락에서 오늘 볼 만한 종목"
              icon={Bot}
              items={brief.watchlist}
              emptyMessage="생성된 주목 종목이 없습니다."
              getKey={(item, i) => `${item.ticker}-${item.name}-${i}`}
              renderCard={(item) => <WatchlistCard item={item} />}
            />
            <BriefCardDeck
              title="내 보유 종목 메모"
              description="매매 일지 진입 이유·시나리오·원칙 메모"
              icon={Briefcase}
              items={brief.holdingsNotes}
              emptyMessage="진행 중인 보유 종목이 없습니다."
              getKey={(item, i) => `${item.ticker}-${item.name}-${i}`}
              renderCard={(item) => <HoldingNoteCard item={item} />}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
