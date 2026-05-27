"use client"

import { Bot, RefreshCw, ShieldAlert, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DailyAiBrief } from "@/lib/gemini-brief-types"

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
  "risk-on": "bg-profit/10 text-profit",
  "risk-off": "bg-loss/10 text-loss",
  mixed: "bg-secondary text-muted-foreground",
}

export function AiMarketBrief({ brief, loading, error, onRefresh }: AiMarketBriefProps) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {brief?.source === "fallback" ? "시장 데이터 브리핑" : "Gemini AI 브리핑"}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-foreground">AI 추천 종목 브리핑</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            시장 데이터, 뉴스, 내 매매 기록을 바탕으로 왜 지금 볼지와 어떤 리스크를 볼지까지 정리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="AI 브리핑 새로고침"
          aria-label="AI 브리핑 새로고침"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="mt-5 rounded-xl border border-border bg-background/80 p-5 text-sm text-muted-foreground">
          Gemini가 오늘 시장 브리핑을 작성하는 중...
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-xl border border-loss/30 bg-loss/5 p-5">
          <p className="text-sm font-medium text-loss">AI 브리핑 오류</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : null}

      {!loading && !error && brief ? (
        <div className="mt-5 space-y-5">
          {brief.notice ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-muted-foreground">
              {brief.notice}
            </div>
          ) : null}
          <div className="rounded-xl border border-border bg-background/80 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-3 py-1 text-xs font-medium", moodClass[brief.marketMood])}>
                {moodLabel[brief.marketMood]}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(brief.generatedAt).toLocaleString("ko-KR")}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-foreground">{brief.summary}</p>
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              {brief.caution} (참고용이며 투자 추천이 아닙니다.)
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/80 p-5">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">오늘 주목 종목</h3>
              </div>
              <div className="mt-4 space-y-3">
                {brief.watchlist.length > 0 ? (
                  brief.watchlist.map((item) => (
                    <div key={`${item.ticker}-${item.name}`} className="rounded-lg border border-border px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="mt-1 text-xs font-mono text-muted-foreground">{item.ticker || "티커 없음"}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-semibold text-primary">왜 지금?</p>
                      <p className="mt-1 text-sm text-foreground">{item.reason}</p>
                      <p className="mt-2 text-xs font-semibold text-loss">무엇을 조심?</p>
                      <p className="mt-1 text-xs text-loss">{item.risk}</p>
                      {item.relation ? (
                        <p className="mt-2 text-xs text-primary">내 기록 연관: {item.relation}</p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">생성된 주목 종목이 없습니다.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/80 p-5">
              <h3 className="font-semibold text-foreground">내 보유 종목 메모</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                매매 일지에 적어 둔 진입 이유·시나리오·원칙 메모를 그대로 보여줍니다.
              </p>
              <div className="mt-4 space-y-3">
                {brief.holdingsNotes.length > 0 ? (
                  brief.holdingsNotes.map((item) => (
                    <div
                      key={`${item.ticker}-${item.name}`}
                      className="rounded-lg border border-border bg-background px-4 py-3"
                    >
                      <p className="font-medium text-foreground">
                        {item.name}
                        {item.ticker ? (
                          <span className="ml-1 font-mono text-xs text-muted-foreground">
                            {item.ticker}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                        {item.note}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    현재 진행 중인 보유 종목이 없습니다. 일지에서 미청산 종목을 등록하면 여기에 메모가 표시됩니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
