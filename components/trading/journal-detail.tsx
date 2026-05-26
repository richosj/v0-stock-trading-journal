"use client";

import { X, ShieldCheck, AlertTriangle, Calendar, Target, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeEntry } from "@/lib/trading-data";
import { getDaysRemaining } from "@/lib/trading-data";

interface JournalDetailProps {
  entry: TradeEntry;
  onClose: () => void;
}

export function JournalDetail({ entry, onClose }: JournalDetailProps) {
  const daysRemaining = getDaysRemaining(entry.targetDate);
  const isProfitable = (entry.pnlRate ?? 0) >= 0;
  const isOpen = entry.status === "보유중";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${entry.stockName} 매매 상세`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  {entry.stockName}
                </h2>
                {entry.ticker && (
                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {entry.ticker}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    entry.tradeType === "매수"
                      ? "bg-[var(--profit-muted)] text-[var(--profit)]"
                      : "bg-[var(--loss-muted)] text-[var(--loss)]"
                  )}
                >
                  {entry.tradeType}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    isOpen
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {entry.status}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* 원칙 준수 여부 */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl p-4 border",
              entry.principleTag === "원칙매매"
                ? "bg-[var(--profit-muted)] border-[var(--profit)]/30"
                : "bg-[var(--loss-muted)] border-[var(--loss)]/30"
            )}
          >
            {entry.principleTag === "원칙매매" ? (
              <ShieldCheck className="w-5 h-5 text-[var(--profit)] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[var(--loss)] shrink-0" />
            )}
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  entry.principleTag === "원칙매매"
                    ? "text-[var(--profit)]"
                    : "text-[var(--loss)]"
                )}
              >
                {entry.principleTag === "원칙매매"
                  ? "원칙 매매 ✓"
                  : "뇌동 매매 ⚠️"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.principleTag === "원칙매매"
                  ? "사전에 수립한 원칙에 따른 매매입니다."
                  : "명확한 원칙 없이 감정에 의한 매매입니다. 반성이 필요합니다."}
              </p>
            </div>
          </div>

          {/* 가격 정보 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-secondary/60 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">진입가</p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {entry.entryPrice.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--profit-muted)] p-3 text-center border border-[var(--profit)]/20">
              <Target className="w-3 h-3 text-[var(--profit)] mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">목표가</p>
              <p className="text-sm font-mono font-semibold text-[var(--profit)]">
                {entry.targetPrice.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--loss-muted)] p-3 text-center border border-[var(--loss)]/20">
              <TrendingDown className="w-3 h-3 text-[var(--loss)] mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">손절가</p>
              <p className="text-sm font-mono font-semibold text-[var(--loss)]">
                {entry.stopLossPrice.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 날짜 + 손익 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary/60 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">목표 기한</p>
              </div>
              <p className="text-sm font-mono font-semibold text-foreground">
                {entry.targetDate}
              </p>
              {isOpen && (
                <p
                  className={cn(
                    "text-xs font-medium mt-0.5",
                    daysRemaining < 0
                      ? "text-[var(--loss)]"
                      : daysRemaining <= 3
                      ? "text-[var(--warning)]"
                      : "text-muted-foreground"
                  )}
                >
                  {daysRemaining < 0
                    ? "기한 초과"
                    : daysRemaining === 0
                    ? "오늘 마감"
                    : `D-${daysRemaining}`}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground mb-1">현재 손익</p>
              <p
                className={cn(
                  "text-sm font-mono font-semibold",
                  isProfitable ? "text-[var(--profit)]" : "text-[var(--loss)]"
                )}
              >
                {isProfitable ? "+" : ""}
                {(entry.pnl ?? 0).toLocaleString()}원
              </p>
              <p
                className={cn(
                  "text-xs font-mono",
                  isProfitable ? "text-[var(--profit)]" : "text-[var(--loss)]"
                )}
              >
                {isProfitable ? "+" : ""}
                {(entry.pnlRate ?? 0).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* 매수 이유 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              왜 샀는가? — 매수 이유
            </h3>
            <p className="text-sm text-foreground leading-relaxed bg-secondary/40 rounded-lg p-4 border border-border">
              {entry.reason || "기록된 매수 이유가 없습니다."}
            </p>
          </div>

          {/* 시나리오 */}
          {entry.scenario && entry.scenario !== entry.reason && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                진입 시나리오
              </h3>
              <p className="text-sm text-foreground leading-relaxed bg-secondary/40 rounded-lg p-4 border border-border">
                {entry.scenario}
              </p>
            </div>
          )}

          {/* 태그 */}
          {entry.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                전략 태그
              </h3>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border",
                      tag === "뇌동매매"
                        ? "bg-[var(--loss-muted)] text-[var(--loss)] border-[var(--loss)]/30"
                        : "bg-primary/10 text-primary border-primary/25"
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
