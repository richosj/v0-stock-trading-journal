"use client";

import {
  TrendingUp,
  TrendingDown,
  Target,
  Briefcase,
  ShieldCheck,
  Gauge,
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

type MetricCardProps = {
  title: string;
  value: string;
  subValue?: string;
  helper: string;
  tone?: "profit" | "loss" | "neutral" | "warning";
  progress?: number;
  icon: React.ComponentType<{ className?: string }>;
};

function MetricCard({
  title,
  value,
  subValue,
  helper,
  tone = "neutral",
  progress,
  icon: Icon,
}: MetricCardProps) {
  const progressStep =
    typeof progress === "number" ? Math.max(0, Math.min(10, Math.round(progress / 10))) : 0;
  const progressWidthClass =
    [
      "w-0",
      "w-[10%]",
      "w-[20%]",
      "w-[30%]",
      "w-[40%]",
      "w-1/2",
      "w-[60%]",
      "w-[70%]",
      "w-[80%]",
      "w-[90%]",
      "w-full",
    ][progressStep] ?? "w-0";

  const toneClasses =
    tone === "profit"
      ? {
          iconBox: "bg-profit/10 text-profit",
          value: "text-profit",
          progress: "bg-profit",
          border: "border-profit/25",
        }
      : tone === "loss"
        ? {
            iconBox: "bg-loss/10 text-loss",
            value: "text-loss",
            progress: "bg-loss",
            border: "border-loss/25",
          }
        : tone === "warning"
          ? {
              iconBox: "bg-warning/15 text-warning",
              value: "text-warning",
              progress: "bg-warning",
              border: "border-warning/25",
            }
          : {
              iconBox: "bg-primary/10 text-primary",
              value: "text-foreground",
              progress: "bg-primary",
              border: "border-border",
            };

  return (
    <div className={cn("rounded-2xl border bg-card/95 p-5 shadow-sm", toneClasses.border)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </p>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", toneClasses.iconBox)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-4">
        <p className={cn("text-2xl font-extrabold tracking-tight", toneClasses.value)}>{value}</p>
        {subValue ? (
          <p className={cn("mt-1 text-sm font-semibold", toneClasses.value)}>{subValue}</p>
        ) : null}
      </div>

      {typeof progress === "number" ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all", toneClasses.progress, progressWidthClass)}
          />
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

export function OverviewCards({ stats, totalTrades }: OverviewCardsProps) {
  const isProfitable = stats.totalPnL >= 0;
  const isWinning = stats.winRate >= 50;
  const principleCount = Math.round((stats.principleRate / 100) * totalTrades);
  const impulsiveCount = totalTrades - principleCount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <MetricCard
        title="총 실현 손익"
        value={formatSignedCurrency(stats.totalPnL)}
        subValue={formatSignedPercent(stats.totalPnLPercent, 2)}
        helper="전체 매매 누적 손익"
        tone={isProfitable ? "profit" : "loss"}
        icon={isProfitable ? TrendingUp : TrendingDown}
      />

      <MetricCard
        title="매매 승률"
        value={formatPercent(stats.winRate, 1)}
        helper="매도가 입력된 거래 기준"
        tone={isWinning ? "profit" : "loss"}
        progress={stats.winRate}
        icon={Target}
      />

      <MetricCard
        title="진행 중 포지션"
        value={`${stats.openPositions} 종목`}
        subValue={`${Math.max(stats.openPositions, 0)}개 관리 중`}
        helper="현재 보유 중인 종목 수"
        tone="neutral"
        progress={Math.min((stats.openPositions / 12) * 100, 100)}
        icon={Briefcase}
      />

      <MetricCard
        title="원칙 준수율"
        value={formatPercent(stats.principleRate, 1)}
        subValue={`원칙 ${principleCount} / 뇌동 ${impulsiveCount}`}
        helper="원칙 매매 실천 비율"
        tone="warning"
        progress={stats.principleRate}
        icon={stats.principleRate >= 70 ? ShieldCheck : Gauge}
      />
    </div>
  );
}
