"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bot,
  Briefcase,
  Crown,
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
  const score = item.entryScore ?? null
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
        {score != null ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold",
              score >= 75
                ? "bg-profit-muted text-profit"
                : score >= 60
                  ? "bg-warning-muted text-warning"
                  : "bg-loss-muted text-loss"
            )}
          >
            적합도 {score}
          </span>
        ) : null}
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

      {item.evidence ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-secondary/20 p-2 text-[10px]">
          <Metric label="전일" value={item.evidence.prevClose} />
          <Metric label="시가" value={item.evidence.open} />
          <Metric label="고가" value={item.evidence.high} />
          <Metric label="저가" value={item.evidence.low} />
          <Metric label="거래량" value={item.evidence.volume} />
          <Metric label="대금" value={item.evidence.value} />
          <Metric label="시총" value={item.evidence.marketCap} />
          <Metric label="PER/PBR" value={joinPerPbr(item.evidence.per, item.evidence.pbr)} />
        </div>
      ) : null}

      {item.relation ? (
        <p className="mt-2 flex items-center gap-1 truncate text-[11px] text-primary">
          <Link2 className="h-3 w-3 shrink-0" />
          {item.relation}
        </p>
      ) : null}
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-foreground">{value ?? "-"}</p>
    </div>
  )
}

function joinPerPbr(per: string | null, pbr: string | null) {
  if (per && pbr) return `${per} / ${pbr}`
  return per ?? pbr
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

function stanceMeta(stance: DailyAiBrief["holdingsCoach"][number]["stance"]) {
  if (stance === "hold") return { label: "보유 우선", icon: ArrowUp, className: "bg-profit-muted text-profit" }
  if (stance === "reduce") return { label: "비중 축소", icon: ArrowDown, className: "bg-warning-muted text-warning" }
  if (stance === "exit") return { label: "청산 검토", icon: AlertTriangle, className: "bg-loss-muted text-loss" }
  return { label: "관망", icon: ArrowRight, className: "bg-secondary text-muted-foreground" }
}

function HoldingCoachCard({ item }: { item: DailyAiBrief["holdingsCoach"][number] }) {
  const meta = stanceMeta(item.stance)
  const Icon = meta.icon
  return (
    <article className="rounded-xl border border-border bg-background p-3 shadow-sm sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{item.name}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{item.ticker || "—"}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.className)}>
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-primary">AI 코멘트</p>
        <p className="mt-1 text-xs leading-5 text-foreground">{item.thesis}</p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border bg-secondary/20 px-2.5 py-2">
          <p className="text-muted-foreground">예상 범위</p>
          <p className="mt-1 font-semibold text-foreground">{item.expectedRange}</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/20 px-2.5 py-2">
          <p className="text-muted-foreground">신뢰도</p>
          <p className="mt-1 font-semibold text-foreground">{item.confidence}%</p>
        </div>
        <div className="rounded-lg border border-profit/20 bg-profit-muted/40 px-2.5 py-2">
          <p className="text-muted-foreground">예상 수익금</p>
          <p className="mt-1 font-semibold text-profit">{item.expectedProfitAmount}</p>
        </div>
        <div className="rounded-lg border border-loss/20 bg-loss-muted/35 px-2.5 py-2">
          <p className="text-muted-foreground">손절 예상금액</p>
          <p className="mt-1 font-semibold text-loss">{item.stopLossAmount}</p>
        </div>
      </div>

      <p className="mt-2 text-xs text-loss">{item.stopGuide}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">리스크 트리거: {item.riskTrigger}</p>
    </article>
  )
}

type ThemeSection = {
  theme: string
  leader: AiWatchItem
  second: AiWatchItem | null
  trigger: string
}

function extractTheme(item: AiWatchItem) {
  const match = item.reason.match(/테마:\s*([^|]+)\s*\|\s*대장 근거:/)
  if (!match) return "기타 테마"
  return match[1].trim()
}

function extractRiskTrigger(risk: string) {
  const firstSentence = risk.split(/[.!?]/)[0]?.trim()
  return firstSentence && firstSentence.length > 2
    ? firstSentence
    : "거래대금 유지와 손절 기준 이탈 여부를 체크하세요"
}

function buildThemeSections(items: AiWatchItem[]): ThemeSection[] {
  const grouped = new Map<string, AiWatchItem[]>()
  items.forEach((item) => {
    const theme = extractTheme(item)
    if (!grouped.has(theme)) grouped.set(theme, [])
    grouped.get(theme)!.push(item)
  })

  return [...grouped.entries()]
    .map(([theme, list]) => ({
      theme,
      leader: list[0],
      second: list[1] ?? null,
      trigger: extractRiskTrigger(list[0]?.risk ?? ""),
    }))
    .slice(0, 3)
}

function ThemeSectionCard({ section }: { section: ThemeSection }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{section.theme}</p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          테마 섹션
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
            <Crown className="h-3 w-3" />
            대장주
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {section.leader.name}
            <span className="ml-1 font-mono text-xs text-muted-foreground">{section.leader.ticker}</span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/25 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">2등주</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {section.second ? (
              <>
                {section.second.name}
                <span className="ml-1 font-mono text-xs text-muted-foreground">{section.second.ticker}</span>
              </>
            ) : (
              <span className="text-muted-foreground">후보 대기</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-warning/20 bg-warning/5 p-3">
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-warning">
          <AlertTriangle className="h-3 w-3" />
          리스크 트리거
        </p>
        <p className="mt-1 text-xs leading-5 text-foreground/90">{section.trigger}</p>
      </div>
    </article>
  )
}

export function AiMarketBrief({ brief, loading, error, onRefresh }: AiMarketBriefProps) {
  const MoodIcon = brief ? moodIcon[brief.marketMood] : Zap
  const [highScoreOnly, setHighScoreOnly] = useState(false)
  const filteredWatchlist = brief
    ? highScoreOnly
      ? brief.watchlist.filter((item) => (item.entryScore ?? 0) >= 70)
      : brief.watchlist
    : []
  const visibleWatchlist = filteredWatchlist.slice(0, 5)
  const themeSections = brief ? buildThemeSections(visibleWatchlist) : []

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
          <section className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">추천 필터</p>
              <p className="text-xs text-muted-foreground">
                적합도 기준으로 우선 확인할 종목만 빠르게 보세요.
              </p>
            </div>
            <label
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-full px-1.5 py-1 text-xs font-semibold transition-colors",
                highScoreOnly ? "bg-profit/15 text-profit" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={highScoreOnly}
                onChange={(event) => setHighScoreOnly(event.target.checked)}
                aria-label="적합도 70+만 보기"
              />
              <span
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  highScoreOnly ? "bg-profit/70" : "bg-border"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    highScoreOnly ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </span>
              <span>{highScoreOnly ? "적합도 70+만 보기" : "전체 보기"}</span>
            </label>
          </section>

          {themeSections.length > 0 ? (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground sm:text-base">테마별 섹션</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  테마별 대장/2등주와 리스크 트리거를 빠르게 확인하세요.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {themeSections.map((section) => (
                  <ThemeSectionCard key={section.theme} section={section} />
                ))}
              </div>
            </section>
          ) : null}

          {/* 모바일: 가로 스트립 */}
          <BriefCardStrip
            title="오늘 주목 종목"
            icon={Bot}
            items={visibleWatchlist}
            emptyMessage={highScoreOnly ? "적합도 70+ 종목이 없습니다." : "생성된 주목 종목이 없습니다."}
            getKey={(item, i) => `${item.ticker}-${item.name}-${i}`}
            renderCard={(item) => <WatchlistCard item={item} />}
          />
          <BriefCardStrip
            title="내 보유 종목 AI 피드백"
            description="들고갈지/비중/손절 기준"
            icon={ShieldAlert}
            items={brief.holdingsCoach}
            emptyMessage="보유 종목 AI 피드백이 없습니다."
            getKey={(item, i) => `${item.ticker}-${item.name}-${i}`}
            renderCard={(item) => <HoldingCoachCard item={item} />}
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
              items={visibleWatchlist}
              emptyMessage={highScoreOnly ? "적합도 70+ 종목이 없습니다." : "생성된 주목 종목이 없습니다."}
              getKey={(item, i) => `${item.ticker}-${item.name}-${i}`}
              renderCard={(item) => <WatchlistCard item={item} />}
            />
            <BriefCardDeck
              title="내 보유 종목 AI 피드백"
              description="들고갈지/비중/손절 기준/예상 범위"
              icon={ShieldAlert}
              items={brief.holdingsCoach}
              emptyMessage="보유 종목 AI 피드백이 없습니다."
              getKey={(item, i) => `${item.ticker}-${item.name}-${i}`}
              renderCard={(item) => <HoldingCoachCard item={item} />}
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
