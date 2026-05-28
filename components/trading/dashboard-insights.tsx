"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { TradingJournal } from "@/lib/supabase";
import type { LiveQuote } from "@/lib/market-quotes";
import {
  formatPercent,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/lib/trading-calculations";
import {
  getMistakeInsights,
  getMonthlyReports,
  getPositionAlerts,
  getStockInsights,
  getStrategyInsights,
} from "@/lib/trading-insights";
import { cn } from "@/lib/utils";

interface DashboardInsightsProps {
  journals: TradingJournal[];
  quotes: LiveQuote[];
}

export function DashboardInsights({ journals, quotes }: DashboardInsightsProps) {
  const monthlyReports = getMonthlyReports(journals);
  const strategyInsights = getStrategyInsights(journals);
  const mistakeInsights = getMistakeInsights(journals);
  const stockInsights = getStockInsights(journals);
  const alerts = getPositionAlerts(
    journals.filter((journal) => journal.exit_price == null),
    quotes
  );

  const currentMonth = monthlyReports[0];

  return (
    <section className="space-y-4" aria-label="복기 인사이트">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">복기 인사이트</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            월별 흐름, 전략 성과, 실수 패턴, 종목별 누적 결과를 한 번에 확인합니다.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          복기 품질 강화
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  이번 달 리포트
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  {currentMonth?.label ?? "이번 달 기록 없음"}
                </h3>
              </div>
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>

            {currentMonth ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground">월 손익</p>
                  <p
                    className={cn(
                      "mt-2 text-lg font-bold",
                      currentMonth.totalPnl >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {formatSignedCurrency(currentMonth.totalPnl)}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground">거래 수</p>
                  <p className="mt-2 text-lg font-bold text-foreground">
                    {currentMonth.tradeCount}건
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground">승률</p>
                  <p className="mt-2 text-lg font-bold text-foreground">
                    {formatPercent(currentMonth.winRate, 1)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-secondary/20 p-4 text-sm text-muted-foreground">
                아직 월 리포트를 만들 만큼 종료된 거래가 없습니다.
              </div>
            )}

            {monthlyReports.length > 1 ? (
              <div className="mt-4 space-y-2">
                {monthlyReports.slice(1, 4).map((report) => (
                  <div
                    key={report.month}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{report.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.tradeCount}건 · 승률 {formatPercent(report.winRate, 1)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        report.totalPnl >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {formatSignedCurrency(report.totalPnl)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    전략 성과 TOP
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">
                    가장 잘 맞는 전략
                  </h3>
                </div>
                <Target className="h-5 w-5 text-primary" />
              </div>

              <div className="mt-4 space-y-3">
                {strategyInsights.length > 0 ? (
                  strategyInsights.map((strategy) => (
                    <div
                      key={strategy.strategy}
                      className="rounded-xl border border-border bg-background px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{strategy.strategy}</p>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            strategy.totalPnl >= 0 ? "text-profit" : "text-loss"
                          )}
                        >
                          {formatSignedCurrency(strategy.totalPnl)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {strategy.count}건 · 승률 {formatPercent(strategy.winRate, 1)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-secondary/20 p-4 text-sm text-muted-foreground">
                    종료된 거래가 쌓이면 전략 성과가 표시됩니다.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    실수 분석
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">
                    습관 점검
                  </h3>
                </div>
                <ShieldAlert className="h-5 w-5 text-warning" />
              </div>

              <div className="mt-4 space-y-3">
                {mistakeInsights.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-warning">{item.value}건</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  가격 경고
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  목표가 / 손절가 알림
                </h3>
              </div>
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>

            <div className="mt-4 space-y-3">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <Link
                    key={`${alert.journalId}-${alert.type}`}
                    href={`/journal/${alert.journalId}`}
                    className="block rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-secondary/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{alert.companyName}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          alert.type === "target-hit" || alert.type === "target-near"
                            ? "bg-profit-muted text-profit"
                            : "bg-loss-muted text-loss"
                        )}
                      >
                        {alert.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{alert.helper}</p>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl bg-secondary/20 p-4 text-sm text-muted-foreground">
                  현재 경고가 필요한 종목이 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  종목별 누적 성과
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  반복 매매 성적표
                </h3>
              </div>
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-4 space-y-3">
              {stockInsights.length > 0 ? (
                stockInsights.map((stock) => (
                  <div
                    key={stock.key}
                    className="rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {stock.companyName}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {stock.ticker || stock.key}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          stock.totalPnl >= 0 ? "text-profit" : "text-loss"
                        )}
                      >
                        {formatSignedCurrency(stock.totalPnl)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      {stock.totalPnl >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-profit" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-loss" />
                      )}
                      {stock.tradeCount}건 · 승률 {formatPercent(stock.winRate, 1)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-secondary/20 p-4 text-sm text-muted-foreground">
                  누적 종목 성과는 종료된 거래가 쌓이면 표시됩니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
