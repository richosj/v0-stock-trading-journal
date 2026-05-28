"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  WifiOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradingJournal } from "@/lib/supabase";
import type { LiveQuote } from "@/lib/market-quotes";
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/lib/trading-calculations";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";

interface LivePricePanelProps {
  positions: TradingJournal[];
  quotes: LiveQuote[];
  loading: boolean;
  onRefresh: () => void;
  variant?: "page" | "embedded";
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

function tickerInitial(position: TradingJournal, quote?: LiveQuote) {
  const sym = quote?.resolvedSymbol ?? position.ticker;
  if (sym && sym.length >= 2) return sym.slice(0, 2).toUpperCase();
  return position.company_name.slice(0, 1);
}

type PositionMetrics = {
  quote: LiveQuote | undefined;
  hasLivePrice: boolean;
  marketValue: number | null;
  unrealizedPnL: number | null;
  unrealizedPercent: number | null;
  isUp: boolean;
  isGain: boolean;
  alertBadges: Array<{ label: string; tone: "profit" | "loss" }>;
};

function getPositionMetrics(
  position: TradingJournal,
  quote: LiveQuote | undefined
): PositionMetrics {
  const hasLivePrice = quote?.regularMarketPrice != null;
  const marketValue = hasLivePrice
    ? quote!.regularMarketPrice! * position.quantity
    : null;
  const unrealizedPnL = hasLivePrice
    ? (quote!.regularMarketPrice! - position.entry_price) * position.quantity
    : null;
  const unrealizedPercent =
    unrealizedPnL != null && position.entry_price > 0
      ? (unrealizedPnL / (position.entry_price * position.quantity)) * 100
      : null;
  const isUp = (quote?.change ?? 0) >= 0;
  const isGain = (unrealizedPnL ?? 0) >= 0;
  const alertBadges: Array<{ label: string; tone: "profit" | "loss" }> = [];

  if (hasLivePrice && position.target_price > 0 && quote!.regularMarketPrice! >= position.target_price) {
    alertBadges.push({ label: "목표", tone: "profit" });
  } else if (
    hasLivePrice &&
    position.target_price > 0 &&
    quote!.regularMarketPrice! >= position.target_price * 0.97
  ) {
    alertBadges.push({ label: "목표 근접", tone: "profit" });
  }

  if (hasLivePrice && position.stop_loss > 0 && quote!.regularMarketPrice! <= position.stop_loss) {
    alertBadges.push({ label: "손절", tone: "loss" });
  } else if (
    hasLivePrice &&
    position.stop_loss > 0 &&
    quote!.regularMarketPrice! <= position.stop_loss * 1.03
  ) {
    alertBadges.push({ label: "손절 근접", tone: "loss" });
  }

  return {
    quote,
    hasLivePrice,
    marketValue,
    unrealizedPnL,
    unrealizedPercent,
    isUp,
    isGain,
    alertBadges,
  };
}

function HoldingTile({
  position,
  metrics,
  className,
}: {
  position: TradingJournal;
  metrics: PositionMetrics;
  className?: string;
}) {
  const { quote, hasLivePrice, marketValue, unrealizedPnL, unrealizedPercent, isUp, isGain, alertBadges } =
    metrics;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card/90 p-4 shadow-sm backdrop-blur-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md",
        hasLivePrice
          ? isGain
            ? "border-profit/20 hover:border-profit/35"
            : "border-loss/20 hover:border-loss/35"
          : "border-border/80 hover:border-border",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-0.5",
          hasLivePrice ? (isGain ? "bg-gradient-to-r from-profit/80 to-profit/20" : "bg-gradient-to-r from-loss/80 to-loss/20") : "bg-muted"
        )}
      />

      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold tracking-tight",
              hasLivePrice ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {tickerInitial(position, quote)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight text-foreground">
              {position.company_name}
            </h3>
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {quote?.resolvedSymbol ?? (position.ticker || "—")}
            </p>
          </div>
        </div>
        {hasLivePrice ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-profit/10 px-2 py-0.5 text-[10px] font-semibold text-profit">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-profit opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-profit" />
            </span>
            LIVE
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            OFF
          </span>
        )}
      </header>

      {alertBadges.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {alertBadges.map((b) => (
            <span
              key={b.label}
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                b.tone === "profit" ? "bg-profit-muted text-profit" : "bg-loss-muted text-loss"
              )}
            >
              {b.label}
            </span>
          ))}
        </div>
      ) : null}

      {hasLivePrice ? (
        <>
          <div className="mt-4 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              현재가
            </p>
            <p className="mt-1 tabular-nums text-xl font-bold tracking-tight text-foreground">
              {formatQuoteCurrency(quote!.regularMarketPrice!, quote!.currency)}
            </p>
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold tabular-nums",
                isUp ? "bg-profit-muted text-profit" : "bg-loss-muted text-loss"
              )}
            >
              {isUp ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {formatSignedPercent(quote!.changePercent ?? 0, 2)}
              <span className="font-normal opacity-80">
                {formatSignedQuoteCurrency(quote!.change ?? 0, quote!.currency)}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">내 수익금</p>
              <p
                className={cn(
                  "mt-1 tabular-nums text-base font-extrabold",
                  isGain ? "text-profit" : "text-loss"
                )}
              >
                {unrealizedPnL != null ? formatSignedCurrency(unrealizedPnL) : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">내 수익률</p>
              <p
                className={cn(
                  "mt-1 tabular-nums text-base font-extrabold",
                  isGain ? "text-profit" : "text-loss"
                )}
              >
                {unrealizedPercent != null ? formatSignedPercent(unrealizedPercent, 2) : "—"}
              </p>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-[11px]">
            <div>
              <dt className="text-muted-foreground">평가금액</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                {marketValue != null ? formatCurrency(marketValue) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">평균단가</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                {formatCurrency(position.entry_price)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">보유 수량</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                {position.quantity.toLocaleString("ko-KR")}주
              </dd>
            </div>
            <div />
          </dl>

          <div
            className={cn(
              "mt-3 rounded-xl border px-3 py-2",
              isUp ? "border-profit/25 bg-profit-muted/50" : "border-loss/25 bg-loss-muted/50"
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">금일 등락</p>
            <p className={cn("mt-1 tabular-nums text-sm font-bold", isUp ? "text-profit" : "text-loss")}>
              {formatSignedQuoteCurrency(quote!.change ?? 0, quote!.currency)}
              <span className="ml-1">({formatSignedPercent(quote!.changePercent ?? 0, 2)})</span>
            </p>
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-1 flex-col justify-center rounded-xl border border-dashed border-border/80 bg-muted/30 px-3 py-5 text-center">
          <WifiOff className="mx-auto h-5 w-5 text-muted-foreground/60" />
          <p className="mt-2 text-xs font-medium text-muted-foreground">시세 조회 불가</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/80">
            {quote?.error ?? "티커를 확인해 주세요"}
          </p>
        </div>
      )}
    </article>
  );
}

function PortfolioHero({
  totalMarketValue,
  totalCostBasis,
  totalUnrealizedPnL,
  totalUnrealizedPercent,
  totalDayChange,
  totalDayChangePercent,
  liveCount,
  totalCount,
  loading,
  onRefresh,
  isPage,
}: {
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPercent: number;
  totalDayChange: number;
  totalDayChangePercent: number;
  liveCount: number;
  totalCount: number;
  loading: boolean;
  onRefresh: () => void;
  isPage: boolean;
}) {
  const isPortfolioUp = totalUnrealizedPnL >= 0;
  const isDayUp = totalDayChange >= 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-foreground/[0.03] via-card to-primary/[0.06] p-5 shadow-sm sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-profit/10 blur-3xl" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          {!isPage ? (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Zap className="h-3 w-3" />
              라이브 포트폴리오
            </div>
          ) : null}
          <p className="text-xs font-medium text-muted-foreground">총 평가금액</p>
          <p className="mt-1 tabular-nums text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {formatCurrency(totalMarketValue)}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">내 수익금</p>
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-1 tabular-nums text-2xl font-extrabold tracking-tight",
                  isPortfolioUp ? "text-profit" : "text-loss"
                )}
              >
                {isPortfolioUp ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                {formatSignedCurrency(totalUnrealizedPnL)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">내 수익률</p>
              <p
                className={cn(
                  "mt-1 tabular-nums text-2xl font-extrabold tracking-tight",
                  isPortfolioUp ? "text-profit" : "text-loss"
                )}
              >
                {formatSignedPercent(totalUnrealizedPercent, 2)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                투자원금 {formatCurrency(totalCostBasis)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-center sm:text-left">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              실시간 연동
            </p>
            <p className="mt-1 tabular-nums text-lg font-bold text-foreground">
              {liveCount}
              <span className="text-sm font-medium text-muted-foreground"> / {totalCount}</span>
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-11 gap-2 rounded-xl border-border/80 bg-background/90 shadow-sm"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {loading ? "갱신 중" : "새로고침"}
          </Button>
        </div>
      </div>
        <div
          className={cn(
            "rounded-2xl border px-4 py-3",
            isDayUp
              ? "border-profit/25 bg-profit-muted/50"
              : "border-loss/25 bg-loss-muted/50"
          )}
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            금일 등락
          </p>
          <p className={cn("mt-1 tabular-nums text-lg font-bold", isDayUp ? "text-profit" : "text-loss")}>
            {formatSignedCurrency(totalDayChange)}
            <span className="ml-1 text-sm font-semibold">
              ({formatSignedPercent(totalDayChangePercent, 2)})
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function LivePricePanel({
  positions,
  quotes,
  loading,
  onRefresh,
  variant = "embedded",
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
  const isPage = variant === "page";

  return (
    <section aria-label="실시간 보유 종목" className="space-y-5">
      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Zap className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">보유 종목이 없습니다</p>
          <p className="mt-1 text-xs text-muted-foreground">진행 중인 매매를 일지에 등록하면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <>
          <PortfolioHero
            totalMarketValue={totalMarketValue}
            totalCostBasis={totalCostBasis}
            totalUnrealizedPnL={totalUnrealizedPnL}
            totalUnrealizedPercent={totalUnrealizedPercent}
            totalDayChange={totalDayChange}
            totalDayChangePercent={totalDayChangePercent}
            liveCount={livePositions.length}
            totalCount={positions.length}
            loading={loading}
            onRefresh={onRefresh}
            isPage={isPage}
          />

          <div className="flex items-center justify-between gap-3 px-0.5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">보유 종목</h2>
              <p className="text-[11px] text-muted-foreground">
                {positions.length}종목 · 데스크톱 4열 · 모바일 스와이프
              </p>
            </div>
          </div>

          {/* 모바일 슬라이드 */}
          <div className="md:hidden">
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent className="-ml-3">
                {positions.map((position) => {
                  const quote = quoteMap.get(position.id);
                  const metrics = getPositionMetrics(position, quote);
                  return (
                    <CarouselItem key={position.id} className="basis-[85%] pl-3 sm:basis-[70%]">
                      <HoldingTile position={position} metrics={metrics} />
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">← 스와이프하여 종목 보기</p>
          </div>

          {/* 1행 4열 (lg+) */}
          <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-4">
            {positions.map((position) => {
              const quote = quoteMap.get(position.id);
              const metrics = getPositionMetrics(position, quote);
              return (
                <HoldingTile key={position.id} position={position} metrics={metrics} />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
