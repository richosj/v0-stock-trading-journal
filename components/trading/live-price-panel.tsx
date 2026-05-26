"use client";

import {
  Activity,
  BadgePercent,
  Building2,
  CircleDollarSign,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradingJournal } from "@/lib/supabase";
import type { LiveQuote } from "@/lib/market-quotes";
import {
  formatCurrency,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/lib/trading-calculations";

interface LivePricePanelProps {
  positions: TradingJournal[];
  quotes: LiveQuote[];
  loading: boolean;
  onRefresh: () => void;
}

function formatQuoteCurrency(value: number, currency: string | null) {
  if (currency === "USD") {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return formatCurrency(value);
}

function formatSignedQuoteCurrency(value: number, currency: string | null) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatQuoteCurrency(Math.abs(value), currency)}`;
}

export function LivePricePanel({
  positions,
  quotes,
  loading,
  onRefresh,
}: LivePricePanelProps) {
  const quoteMap = new Map(quotes.map((quote) => [quote.journalId, quote]));
  const livePositions = positions.filter((position) => {
    const quote = quoteMap.get(position.id);
    return quote?.regularMarketPrice != null;
  });
  const totalCostBasis = livePositions.reduce(
    (sum, position) => sum + position.entry_price * position.quantity,
    0
  );
  const totalMarketValue = livePositions.reduce((sum, position) => {
    const quote = quoteMap.get(position.id);
    return sum + (quote?.regularMarketPrice ?? 0) * position.quantity;
  }, 0);
  const totalUnrealizedPnL = totalMarketValue - totalCostBasis;
  const totalUnrealizedPercent =
    totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;
  const totalDayChange = livePositions.reduce((sum, position) => {
    const quote = quoteMap.get(position.id);
    return sum + (quote?.change ?? 0) * position.quantity;
  }, 0);
  const totalPreviousValue = livePositions.reduce((sum, position) => {
    const quote = quoteMap.get(position.id);
    return sum + (quote?.previousClose ?? 0) * position.quantity;
  }, 0);
  const totalDayChangePercent =
    totalPreviousValue > 0 ? (totalDayChange / totalPreviousValue) * 100 : 0;
  const isPortfolioUp = totalUnrealizedPnL >= 0;
  const isDayUp = totalDayChange >= 0;
  const unavailableCount = positions.length - livePositions.length;

  return (
    <section aria-label="실시간 보유 종목" className="space-y-4">
      {positions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          현재 보유 중인 종목이 없습니다.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Activity className="h-3.5 w-3.5" />
                  라이브 포트폴리오
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                    실시간 보유 종목
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    보유 종목이 많아도 한눈에 보이도록 핵심 지표와 종목별 카드로 정리했습니다.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground">실시간 반영</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {livePositions.length}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">
                      / {positions.length} 종목
                    </span>
                  </p>
                  {unavailableCount > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {unavailableCount}개 종목은 티커 확인이 필요합니다.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      모든 보유 종목이 실시간 반영 중입니다.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                  새로고침
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    합산 평가금액
                  </p>
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-lg font-bold text-foreground sm:text-2xl">
                  {livePositions.length > 0 ? formatCurrency(totalMarketValue) : "-"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  실시간 반영 종목 기준
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    합산 평가손익
                  </p>
                  <CircleDollarSign
                    className={cn("h-4 w-4", isPortfolioUp ? "text-profit" : "text-loss")}
                  />
                </div>
                <p
                  className={cn(
                    "mt-3 text-lg font-bold sm:text-2xl",
                    isPortfolioUp ? "text-profit" : "text-loss"
                  )}
                >
                  {livePositions.length > 0
                    ? formatSignedCurrency(totalUnrealizedPnL)
                    : "-"}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs font-medium",
                    isPortfolioUp ? "text-profit" : "text-loss"
                  )}
                >
                  {livePositions.length > 0
                    ? formatSignedPercent(totalUnrealizedPercent, 2)
                    : "-"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    당일 변동
                  </p>
                  {isDayUp ? (
                    <TrendingUp className="h-4 w-4 text-profit" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-loss" />
                  )}
                </div>
                <p
                  className={cn(
                    "mt-3 text-lg font-bold sm:text-2xl",
                    isDayUp ? "text-profit" : "text-loss"
                  )}
                >
                  {livePositions.length > 0 ? formatSignedCurrency(totalDayChange) : "-"}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs font-medium",
                    isDayUp ? "text-profit" : "text-loss"
                  )}
                >
                  {livePositions.length > 0
                    ? formatSignedPercent(totalDayChangePercent, 2)
                    : "-"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    실시간 반영률
                  </p>
                  <BadgePercent className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-lg font-bold text-foreground sm:text-2xl">
                  {positions.length > 0
                    ? formatSignedPercent((livePositions.length / positions.length) * 100, 0).replace("+", "")
                    : "-"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  조회 가능 {livePositions.length} / 전체 {positions.length}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            {positions.map((position) => {
              const quote = quoteMap.get(position.id);
              const hasLivePrice = quote?.regularMarketPrice != null;
              const marketValue = hasLivePrice
                ? quote.regularMarketPrice! * position.quantity
                : null;
              const unrealizedPnL = hasLivePrice
                ? (quote.regularMarketPrice! - position.entry_price) * position.quantity
                : null;
              const unrealizedPercent =
                unrealizedPnL != null && position.entry_price > 0
                  ? (unrealizedPnL / (position.entry_price * position.quantity)) * 100
                  : null;
              const isUp = (quote?.change ?? 0) >= 0;
              const isGain = (unrealizedPnL ?? 0) >= 0;

              return (
                <div
                  key={position.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
                            {position.company_name}
                          </h3>
                          <p className="text-xs text-muted-foreground sm:text-sm">
                            티커: {quote?.resolvedSymbol ?? (position.ticker || "미입력")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                          hasLivePrice
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {hasLivePrice ? "실시간 반영" : "조회 불가"}
                      </span>
                    </div>
                  </div>

                  {hasLivePrice ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.9fr)]">
                        <div className="rounded-xl border border-border bg-background p-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            현재가
                          </p>
                          <p className="mt-2 text-2xl font-bold text-foreground">
                            {formatQuoteCurrency(
                              quote!.regularMarketPrice!,
                              quote!.currency
                            )}
                          </p>
                          <p
                            className={cn(
                              "mt-2 inline-flex flex-wrap items-center gap-1 text-sm font-medium",
                              isUp ? "text-profit" : "text-loss"
                            )}
                          >
                            {isUp ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {formatSignedQuoteCurrency(
                              quote!.change ?? 0,
                              quote!.currency
                            )}
                            <span>
                              ({formatSignedPercent(quote!.changePercent ?? 0, 2)})
                            </span>
                          </p>
                        </div>

                        <div className="rounded-xl border border-border bg-secondary/25 p-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            보유 정보
                          </p>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">평균 매수가</span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(position.entry_price)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">수량</span>
                              <span className="font-semibold text-foreground">
                                {formatQuantity(position.quantity)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">현재 상태</span>
                              <span className={cn("font-semibold", isGain ? "text-profit" : "text-loss")}>
                                {isGain ? "수익 중" : "손실 중"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-border bg-secondary/20 p-4">
                          <p className="text-xs text-muted-foreground">평가금액</p>
                          <p className="mt-2 text-sm font-semibold text-foreground sm:text-base">
                            {marketValue != null ? formatCurrency(marketValue) : "-"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-secondary/20 p-4">
                          <p className="text-xs text-muted-foreground">평가손익</p>
                          <p
                            className={cn(
                              "mt-2 text-sm font-semibold sm:text-base",
                              isGain ? "text-profit" : "text-loss"
                            )}
                          >
                            {unrealizedPnL != null
                              ? formatSignedCurrency(unrealizedPnL)
                              : "-"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-secondary/20 p-4">
                          <p className="text-xs text-muted-foreground">평가수익률</p>
                          <p
                            className={cn(
                              "mt-2 text-sm font-semibold sm:text-base",
                              isGain ? "text-profit" : "text-loss"
                            )}
                          >
                            {unrealizedPercent != null
                              ? formatSignedPercent(unrealizedPercent, 2)
                              : "-"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-secondary/20 p-4">
                          <p className="text-xs text-muted-foreground">전일 대비</p>
                          <p
                            className={cn(
                              "mt-2 text-sm font-semibold sm:text-base",
                              isUp ? "text-profit" : "text-loss"
                            )}
                          >
                            {formatSignedQuoteCurrency(
                              quote!.change ?? 0,
                              quote!.currency
                            )}
                          </p>
                        </div>
                      </div>

                      {quote?.marketTime && (
                        <p className="mt-4 text-xs text-muted-foreground">
                          업데이트:{" "}
                          {new Date(quote.marketTime * 1000).toLocaleString("ko-KR")}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 mb-2">
                        <WifiOff className="w-4 h-4" />
                        <span className="font-medium">실시간 시세를 표시할 수 없습니다.</span>
                      </div>
                      <p>{quote?.error ?? "유효한 티커를 확인해주세요."}</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                        <div className="rounded-lg bg-background px-3 py-2">
                          평균 매수가: {formatCurrency(position.entry_price)}
                        </div>
                        <div className="rounded-lg bg-background px-3 py-2">
                          수량: {formatQuantity(position.quantity)}
                        </div>
                        <div className="rounded-lg bg-background px-3 py-2 col-span-2 sm:col-span-1">
                          예: `AAPL`, `005930`
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
