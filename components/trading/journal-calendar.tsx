"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TradingJournal } from "@/lib/supabase";
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/lib/trading-calculations";

interface JournalCalendarProps {
  journals: TradingJournal[];
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function JournalCalendar({ journals }: JournalCalendarProps) {
  const today = new Date();
  const [monthDate, setMonthDate] = useState(() => getMonthStart(today));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const monthStart = getMonthStart(monthDate);
  const monthEnd = getMonthEnd(monthDate);
  const firstDayOffset = monthStart.getDay();
  const totalDays = monthEnd.getDate();
  const days: Array<Date | null> = Array.from({ length: firstDayOffset }, () => null);

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  const dayMap = new Map<
    string,
    { journals: TradingJournal[]; totalPnl: number; hasClosed: boolean }
  >();

  for (const journal of journals) {
    const dateKey = journal.trade_date;
    const current = dayMap.get(dateKey) ?? {
      journals: [],
      totalPnl: 0,
      hasClosed: false,
    };

    current.journals.push(journal);
    if (journal.pnl != null) {
      current.totalPnl += journal.pnl;
      current.hasClosed = true;
    }
    dayMap.set(dateKey, current);
  }

  const selectedEntries = selectedDateKey ? dayMap.get(selectedDateKey)?.journals ?? [] : [];

  return (
    <section className="space-y-4" aria-label="캘린더 복기">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">캘린더 복기</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              날짜별 매매 기록과 손익 분위기를 빠르게 훑어볼 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setMonthDate(
                  new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)
                )
              }
              title="이전 달 보기"
              aria-label="이전 달 보기"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-[112px] text-center text-sm font-semibold text-foreground">
              {monthDate.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                setMonthDate(
                  new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
                )
              }
              title="다음 달 보기"
              aria-label="다음 달 보기"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`blank-${index}`} className="min-h-[88px] rounded-xl bg-transparent" />;
            }

            const dateKey = formatDateKey(date);
            const record = dayMap.get(dateKey);
            const isToday = dateKey === formatDateKey(today);
            const isSelected = selectedDateKey === dateKey;
            const pnl = record?.totalPnl ?? 0;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDateKey(dateKey)}
                className={cn(
                  "min-h-[88px] rounded-xl border p-2 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-secondary/30"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isToday ? "text-primary" : "text-foreground"
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {record?.journals.length ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {record.journals.length}건
                    </span>
                  ) : null}
                </div>

                {record ? (
                  <div className="mt-3 space-y-1">
                    <div className="h-1.5 rounded-full bg-secondary">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          record.hasClosed
                            ? pnl >= 0
                              ? "bg-profit"
                              : "bg-loss"
                            : "bg-primary"
                        )}
                        style={{ width: `${Math.min(record.journals.length * 20, 100)}%` }}
                      />
                    </div>
                    <p
                      className={cn(
                        "text-[11px] font-medium",
                        record.hasClosed
                          ? pnl >= 0
                            ? "text-profit"
                            : "text-loss"
                          : "text-muted-foreground"
                      )}
                    >
                      {record.hasClosed ? formatSignedCurrency(pnl) : "기록만 있음"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-muted-foreground">기록 없음</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDateKey ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {new Date(selectedDateKey).toLocaleDateString("ko-KR")} 기록
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                선택한 날짜의 매매를 바로 복기하세요.
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              {selectedEntries.length}건
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {selectedEntries.length > 0 ? (
              selectedEntries.map((journal) => (
                <Link
                  key={journal.id}
                  href={`/journal/${journal.id}`}
                  className="block rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-secondary/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {journal.company_name}
                      </p>
                      <p className="mt-1 text-xs font-mono text-muted-foreground">
                        {journal.ticker || "티커 미입력"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(journal.entry_price)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {journal.pnl_percent != null
                          ? formatSignedPercent(journal.pnl_percent, 2)
                          : "진행 중"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">선택한 날짜의 기록이 없습니다.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
