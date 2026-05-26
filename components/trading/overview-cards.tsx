"use client";

import {
  TrendingUp,
  TrendingDown,
  Target,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPercent,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/lib/trading-calculations";

interface OverviewCardsProps {
  stats: {
    totalPnL: number;
    totalPnLPercent: number;
    winRate: number;
    openPositions: number;
    principleRate: number;
  };
  totalTrades: number;
}

export function OverviewCards({ stats, totalTrades }: OverviewCardsProps) {
  const isProfitable = stats.totalPnL >= 0;
  const isWinning = stats.winRate >= 50;
  const principleCount = Math.round((stats.principleRate / 100) * totalTrades);
  const impulsiveCount = totalTrades - principleCount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* 총 실현 손익 */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            총 실현 손익
          </span>
          <span
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg",
              isProfitable
                ? "bg-[var(--profit-muted)] text-[var(--profit)]"
                : "bg-[var(--loss-muted)] text-[var(--loss)]"
            )}
          >
            {isProfitable ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </span>
        </div>
        <div>
          <p
            className={cn(
              "text-2xl font-bold font-mono",
              isProfitable
                ? "text-profit"
                : "text-loss"
            )}
          >
            {formatSignedCurrency(stats.totalPnL)}
          </p>
          <p
            className={cn(
              "text-sm font-mono mt-0.5",
              isProfitable
                ? "text-profit"
                : "text-loss"
            )}
          >
            {formatSignedPercent(stats.totalPnLPercent, 2)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">전체 매매 누적 손익</p>
      </div>

      {/* 매매 승률 */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            매매 승률
          </span>
          <span
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg",
              isWinning
                ? "bg-[var(--profit-muted)] text-[var(--profit)]"
                : "bg-[var(--loss-muted)] text-[var(--loss)]"
            )}
          >
            <Target className="w-4 h-4" />
          </span>
        </div>
        <div>
          <p
            className={cn(
              "text-2xl font-bold font-mono",
              isWinning ? "text-profit" : "text-loss"
            )}
          >
            {formatPercent(stats.winRate, 1)}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isWinning ? "bg-profit" : "bg-loss"
              )}
              style={{ width: `${stats.winRate}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">매도가 입력된 거래 기준</p>
      </div>

      {/* 진행 중인 포지션 */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            진행 중인 포지션
          </span>
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
            <Briefcase className="w-4 h-4" />
          </span>
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {stats.openPositions}
            <span className="text-base font-medium text-muted-foreground ml-1">
              종목
            </span>
          </p>
          <div className="flex gap-1 mt-2 flex-wrap">
            {Array.from({ length: stats.openPositions }).map((_, i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-primary inline-block"
              />
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">현재 보유 중인 종목 수</p>
      </div>

      {/* 매매 원칙 준수율 */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            원칙 준수율
          </span>
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--warning-muted)] text-[var(--warning)]">
            <ShieldCheck className="w-4 h-4" />
          </span>
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-warning">
            {formatPercent(stats.principleRate, 1)}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-warning transition-all"
              style={{ width: `${stats.principleRate}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          원칙{" "}
          <span className="text-profit font-medium">
            {principleCount}
          </span>{" "}
          / 뇌동{" "}
          <span className="text-loss font-medium">
            {impulsiveCount}
          </span>
        </p>
      </div>
    </div>
  );
}
