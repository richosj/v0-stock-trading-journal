"use client";

import { useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, CircleDollarSign, Target } from "lucide-react";
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

  while (days.length % 7 !== 0) {
    days.push(null);
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

  const todayKey = formatDateKey(today);
  const selectedRecord = selectedDateKey ? dayMap.get(selectedDateKey) ?? null : null;
  const selectedEntries = selectedDateKey ? dayMap.get(selectedDateKey)?.journals ?? [] : [];

  return (
    <section className="space-y-3 sm:space-y-4" aria-label="캘린더 복기">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">캘린더 복기</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              날짜 흐름은 촘촘하게 보고, 상세 복기는 아래 패널에서 확인하세요.
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
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
            <div className="min-w-[124px] text-center text-sm font-semibold text-foreground">
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

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-profit" />
            수익 마감
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-loss" />
            손실 마감
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            진행 중
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted" />
            기록 없음
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground sm:gap-1.5">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <div key={day} className="py-1.5">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`blank-${index}`} className="h-[64px] rounded-lg bg-transparent sm:h-[76px]" />;
            }

            const dateKey = formatDateKey(date);
            const record = dayMap.get(dateKey);
            const isToday = dateKey === todayKey;
            const isSelected = selectedDateKey === dateKey;
            const pnl = record?.totalPnl ?? 0;
            const toneClass = !record
              ? "bg-background"
              : !record.hasClosed
                ? "bg-primary/6"
                : pnl >= 0
                  ? "bg-profit/5"
                  : "bg-loss/5";
            const dotClass = !record
              ? "bg-muted"
              : !record.hasClosed
                ? "bg-primary"
                : pnl >= 0
                  ? "bg-profit"
                  : "bg-loss";

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDateKey(dateKey)}
                className={cn(
                  "flex h-[64px] flex-col rounded-lg border p-1.5 text-left transition-all sm:h-[76px] sm:p-2",
                  toneClass,
                  isSelected
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-border hover:border-primary/30 hover:bg-secondary/20"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-xs font-semibold sm:text-sm",
                      isToday ? "text-primary" : "text-foreground"
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {record?.journals.length ? (
                    <span className="rounded-full bg-background/90 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground sm:px-2">
                      {record.journals.length}
                    </span>
                  ) : null}
                </div>

                {record ? (
                  <div className="mt-auto space-y-1">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(record.journals.length, 3) }).map((_, dotIndex) => (
                        <span key={`${dateKey}-dot-${dotIndex}`} className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
                      ))}
                      {record.journals.length > 3 ? (
                        <span className="text-[9px] font-medium text-muted-foreground">
                          +{record.journals.length - 3}
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "truncate text-[10px] font-medium",
                        record.hasClosed
                          ? pnl >= 0
                            ? "text-profit"
                            : "text-loss"
                          : "text-muted-foreground"
                      )}
                    >
                      {record.hasClosed ? formatSignedCurrency(pnl) : "진행 중"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-auto text-[10px] text-muted-foreground/70">-</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDateKey ? (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {new Date(selectedDateKey).toLocaleDateString("ko-KR")} 기록
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                선택한 날짜의 매매를 바로 복기하세요.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                {selectedEntries.length}건
              </span>
              {selectedRecord?.hasClosed ? (
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    (selectedRecord.totalPnl ?? 0) >= 0
                      ? "bg-profit/10 text-profit"
                      : "bg-loss/10 text-loss"
                  )}
                >
                  {formatSignedCurrency(selectedRecord.totalPnl)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {selectedEntries.length > 0 ? (
              selectedEntries.map((journal) => (
                <Link
                  key={journal.id}
                  href={`/journal/${journal.id}`}
                  className={cn(
                    "block rounded-xl border bg-background px-4 py-3 transition-all hover:shadow-sm",
                    journal.pnl_percent == null
                      ? "border-border hover:bg-secondary/30"
                      : (journal.pnl_percent ?? 0) >= 0
                        ? "border-profit/30 hover:bg-profit/5"
                        : "border-loss/30 hover:bg-loss/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {journal.company_name}
                      </p>
                      <p className="mt-1 text-xs font-mono text-muted-foreground">
                        {journal.ticker || "티커 미입력"}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarClock className="h-3 w-3" />
                        {new Date(journal.trade_date).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                        <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatCurrency(journal.entry_price)}
                      </p>
                      <p
                        className={cn(
                          "mt-1 inline-flex items-center gap-1 text-xs font-medium",
                          journal.pnl_percent == null
                            ? "text-muted-foreground"
                            : (journal.pnl_percent ?? 0) >= 0
                              ? "text-profit"
                              : "text-loss"
                        )}
                      >
                        <Target className="h-3 w-3" />
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
