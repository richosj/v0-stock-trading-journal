"use client";

import { RefreshCw, TrendingDown, TrendingUp, WifiOff } from "lucide-react";
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

  return (
    <section aria-label="실시간 보유 종목" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">실시간 보유 종목</h2>
          <p className="text-sm text-muted-foreground mt-1">
            현재 보유 종목의 실시간 가격과 진입가 대비 평가손익입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          새로고침
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          현재 보유 중인 종목이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                className="rounded-xl border border-border bg-card p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {position.company_name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      티커: {quote?.resolvedSymbol ?? (position.ticker || "미입력")}
                    </p>
                  </div>
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

                {hasLivePrice ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">현재가</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">
                          {formatQuoteCurrency(
                            quote!.regularMarketPrice!,
                            quote!.currency
                          )}
                        </p>
                        <p
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 text-sm font-medium",
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
                          )} (
                          {formatSignedPercent(quote!.changePercent ?? 0, 2)})
                        </p>
                      </div>
                      <div className="rounded-xl bg-secondary/40 p-4">
                        <p className="text-sm text-muted-foreground">진입 정보</p>
                        <p className="mt-2 text-sm text-foreground">
                          진입가: {formatCurrency(position.entry_price)}
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          수량: {formatQuantity(position.quantity)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-border bg-secondary/30 p-4">
                        <p className="text-sm text-muted-foreground">평가금액</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {marketValue != null ? formatCurrency(marketValue) : "-"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-secondary/30 p-4">
                        <p className="text-sm text-muted-foreground">평가손익</p>
                        <p
                          className={cn(
                            "mt-2 text-lg font-semibold",
                            isGain ? "text-profit" : "text-loss"
                          )}
                        >
                          {unrealizedPnL != null
                            ? formatSignedCurrency(unrealizedPnL)
                            : "-"}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-sm font-medium",
                            isGain ? "text-profit" : "text-loss"
                          )}
                        >
                          {unrealizedPercent != null
                            ? formatSignedPercent(unrealizedPercent, 2)
                            : "-"}
                        </p>
                      </div>
                    </div>

                    {quote?.marketTime && (
                      <p className="text-xs text-muted-foreground">
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
                    <p className="mt-2">예: 미국 주식은 `AAPL`, 한국 주식은 `005930`처럼 입력하면 됩니다.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
