"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Search,
  Filter,
  Pencil,
  Trash2,
  CalendarClock,
  BadgeCheck,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradingJournal } from "@/lib/supabase";
import { deleteJournal } from "@/lib/trading-service";
import { toast } from "sonner";
import Link from "next/link";
import {
  formatCurrency,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/lib/trading-calculations";
import { getOwnerLabel } from "@/lib/auth/shared";
import { JournalStyleBadge } from "@/components/trading/journal-style-badge";
import {
  inferTradeStyleFromStrategy,
  type JournalTradeStyle,
} from "@/lib/journal-templates";
import type { LiveQuote } from "@/lib/market-quotes";

function computeOpenPositionPnl(journal: TradingJournal, quote?: LiveQuote) {
  if (journal.exit_price != null) return null;
  const price = quote?.regularMarketPrice;
  if (price == null || journal.entry_price <= 0) return null;
  const qty = Math.max(1, journal.quantity || 1);
  const pnl = (price - journal.entry_price) * qty;
  const pnlPercent = ((price - journal.entry_price) / journal.entry_price) * 100;
  return { pnl, pnlPercent };
}

function getJournalPnlPercent(journal: TradingJournal, quoteMap: Map<string, LiveQuote>) {
  if (journal.exit_price != null) return journal.pnl_percent ?? 0;
  return computeOpenPositionPnl(journal, quoteMap.get(journal.id))?.pnlPercent ?? 0;
}

function JournalPnlCell({
  journal,
  quote,
}: {
  journal: TradingJournal;
  quote?: LiveQuote;
}) {
  const hasRealizedResult =
    journal.exit_price != null && journal.pnl != null && journal.pnl_percent != null;
  const openPnl = computeOpenPositionPnl(journal, quote);

  if (hasRealizedResult) {
    const isProfitable = (journal.pnl_percent ?? 0) >= 0;
    return (
      <div>
        <p className="text-[10px] text-muted-foreground">실현</p>
        <p
          className={cn(
            "font-mono font-semibold text-sm",
            isProfitable ? "text-profit" : "text-loss"
          )}
        >
          {formatSignedPercent(journal.pnl_percent ?? 0, 2)}
        </p>
        <p className="text-xs font-mono text-muted-foreground">
          {formatSignedCurrency(journal.pnl ?? 0)}
        </p>
      </div>
    );
  }

  if (openPnl) {
    const isProfitable = openPnl.pnlPercent >= 0;
    return (
      <div>
        <p className="text-[10px] text-primary">현재(평가)</p>
        <p
          className={cn(
            "font-mono font-semibold text-sm",
            isProfitable ? "text-profit" : "text-loss"
          )}
        >
          {formatSignedPercent(openPnl.pnlPercent, 2)}
        </p>
        <p className="text-xs font-mono text-muted-foreground">
          {formatSignedCurrency(openPnl.pnl)}
        </p>
      </div>
    );
  }

  if (journal.exit_price == null) {
    return <span className="text-xs text-muted-foreground">시세 조회 중</span>;
  }

  return <span className="text-muted-foreground">-</span>;
}

interface JournalTableProps {
  journals: TradingJournal[];
  canWrite: boolean;
}

type FilterType = "전체" | "open" | "closed";
type StyleFilter = "all" | JournalTradeStyle;

const PAGE_SIZE = 12;

export function JournalTable({ journals: initialJournals, canWrite }: JournalTableProps) {
  const [journals, setJournals] = useState(initialJournals);
  const [filter, setFilter] = useState<FilterType>("전체");
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"trade_date" | "pnl_percent">("trade_date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [quoteMap, setQuoteMap] = useState<Map<string, LiveQuote>>(new Map());

  useEffect(() => {
    setJournals(initialJournals);
  }, [initialJournals]);

  useEffect(() => {
    const open = journals.filter((journal) => journal.exit_price == null);
    if (open.length === 0) {
      setQuoteMap(new Map());
      return;
    }

    let cancelled = false;

    const loadQuotes = async () => {
      try {
        const response = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positions: open.map((journal) => ({
              id: journal.id,
              ticker: journal.ticker,
              company_name: journal.company_name,
              entry_price: journal.entry_price,
              quantity: journal.quantity,
            })),
          }),
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as { quotes?: LiveQuote[] };
        const next = new Map<string, LiveQuote>();
        for (const quote of payload.quotes ?? []) {
          next.set(quote.journalId, quote);
        }
        if (!cancelled) setQuoteMap(next);
      } catch {
        if (!cancelled) setQuoteMap(new Map());
      }
    };

    loadQuotes();
    const timer = window.setInterval(loadQuotes, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [journals]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setDeletingId(id);
    try {
      const success = await deleteJournal(id);
      if (success) {
        setJournals((prev) => prev.filter((j) => j.id !== id));
        toast.success("삭제되었습니다.");
      } else {
        toast.error("삭제에 실패했습니다.");
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (col: "trade_date" | "pnl_percent") => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const counts = useMemo(() => {
    const open = journals.filter((j) => j.exit_price == null).length;
    return {
      all: journals.length,
      open,
      closed: journals.length - open,
      swing: journals.filter((j) => inferTradeStyleFromStrategy(j.strategy) === "swing").length,
      day: journals.filter((j) => inferTradeStyleFromStrategy(j.strategy) === "day").length,
      dividend: journals.filter((j) => inferTradeStyleFromStrategy(j.strategy) === "dividend").length,
    };
  }, [journals]);

  const filtered = useMemo(
    () =>
      journals
        .filter((j) => {
          if (filter === "open") return j.exit_price == null;
          if (filter === "closed") return j.exit_price != null;
          return true;
        })
        .filter((j) => {
          if (styleFilter === "all") return true;
          return inferTradeStyleFromStrategy(j.strategy) === styleFilter;
        })
        .filter((j) => {
          const q = search.toLowerCase();
          return (
            j.company_name.toLowerCase().includes(q) ||
            j.ticker.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => {
          if (sortBy === "trade_date") {
            const diff = new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime();
            return sortDir === "desc" ? diff : -diff;
          }
          const diff =
            getJournalPnlPercent(b, quoteMap) - getJournalPnlPercent(a, quoteMap);
          return sortDir === "desc" ? diff : -diff;
        }),
    [journals, filter, styleFilter, search, sortBy, sortDir, quoteMap]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageWindowStart = Math.max(1, safePage - 2);
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + 4);
  const pageNumbers = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, i) => pageWindowStart + i
  );

  useEffect(() => {
    setPage(1);
  }, [filter, styleFilter, search, sortBy, sortDir]);

  return (
    <>
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Table header controls */}
        <div className="px-4 py-4 sm:px-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-border bg-background/60">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-foreground">매매 일지</h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {journals.length}건
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="종목명 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {/* Filter */}
            <div className="flex flex-wrap gap-2 self-start">
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["전체", "open", "closed"] as FilterType[]).map((f) => {
                  const label = f === "전체" ? "전체" : f === "open" ? "진행 중" : "청산 완료";
                  const count =
                    f === "전체" ? counts.all : f === "open" ? counts.open : counts.closed;
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium transition-colors",
                        filter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: "all" as const, label: "스타일 전체" },
                    { id: "swing" as const, label: `스윙 (${counts.swing})` },
                    { id: "day" as const, label: `단타 (${counts.day})` },
                    { id: "dividend" as const, label: `배당 (${counts.dividend})` },
                  ] as const
                ).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStyleFilter(chip.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      styleFilter === chip.id
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground text-sm sm:px-6">
            <Filter className="w-5 h-5 mx-auto mb-2 opacity-40" />
            검색 결과가 없습니다
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 sm:hidden">
              {pageItems.map((journal) => {
                const hasRealizedResult =
                  journal.exit_price != null &&
                  journal.pnl != null &&
                  journal.pnl_percent != null;
                const isProfitable = (journal.pnl_percent ?? 0) >= 0;

                return (
                  <Link
                    key={journal.id}
                    href={`/journal/${journal.id}`}
                    className={cn(
                      "rounded-2xl border bg-background p-4 transition-all hover:shadow-sm",
                      hasRealizedResult
                        ? isProfitable
                          ? "border-profit/30 hover:bg-profit/5"
                          : "border-loss/30 hover:bg-loss/5"
                        : "border-border hover:bg-secondary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-foreground">
                            {journal.company_name}
                          </p>
                          <JournalStyleBadge strategy={journal.strategy} />
                        </div>
                        <p className="mt-1 text-xs font-mono text-muted-foreground">
                          {journal.ticker || "티커 미입력"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getOwnerLabel(journal.owner_key)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            journal.exit_price == null
                              ? "bg-warning-muted text-warning"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          {journal.exit_price == null ? "진행 중" : "청산 완료"}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            journal.is_principle
                              ? "bg-profit-muted text-profit"
                              : "bg-loss-muted text-loss"
                          )}
                        >
                          {journal.is_principle ? "원칙" : "뇌동"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-secondary/40 p-3">
                        <p className="text-[11px] text-muted-foreground">평균 매수가</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatCurrency(journal.entry_price)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-3">
                        <p className="text-[11px] text-muted-foreground">수량</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatQuantity(journal.quantity)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-3">
                        <p className="text-[11px] text-muted-foreground">매도가</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {journal.exit_price != null ? formatCurrency(journal.exit_price) : "-"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-secondary/40 p-3">
                        <p className="text-[11px] text-muted-foreground">진입일</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {new Date(journal.trade_date).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3">
                      <JournalPnlCell journal={journal} quote={quoteMap.get(journal.id)} />

                      {canWrite ? (
                        <button
                          onClick={(e) => handleDelete(e, journal.id)}
                          disabled={deletingId === journal.id}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-loss/10 hover:text-loss disabled:opacity-40"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[880px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[6%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-background/60">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground sm:px-6">
                      종목 · 스타일
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground">
                      평균 매수가
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground">
                      수량
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground">
                      매도가
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground">
                      <button
                        onClick={() => handleSort("trade_date")}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        진입일
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-muted-foreground">
                      <button
                        onClick={() => handleSort("pnl_percent")}
                        className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors"
                      >
                        수익률 · 손익금
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground">
                      상태
                    </th>
                    <th className="px-3 py-3 text-xs font-medium text-muted-foreground text-right">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((journal) => {
                    const hasRealizedResult =
                      journal.exit_price != null &&
                      journal.pnl != null &&
                      journal.pnl_percent != null;
                    const isProfitable = (journal.pnl_percent ?? 0) >= 0;

                    return (
                      <tr
                        key={journal.id}
                        className={cn(
                          "border-b border-border/50 transition-colors group",
                          hasRealizedResult
                            ? isProfitable
                              ? "hover:bg-profit/5"
                              : "hover:bg-loss/5"
                            : "hover:bg-secondary/20"
                        )}
                      >
                        <td className="px-4 py-4 sm:px-6">
                          <Link href={`/journal/${journal.id}`} className="block min-w-0 hover:opacity-80">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                                {journal.company_name}
                              </p>
                              <JournalStyleBadge strategy={journal.strategy} />
                            </div>
                            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                              {journal.ticker || "—"}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {getOwnerLabel(journal.owner_key)}
                            </p>
                          </Link>
                        </td>
                        <td className="px-3 py-4 text-right font-mono text-sm tabular-nums text-foreground">
                          {formatCurrency(journal.entry_price)}
                        </td>
                        <td className="px-3 py-4 text-right font-mono text-sm tabular-nums text-foreground">
                          {formatQuantity(journal.quantity)}
                        </td>
                        <td className="px-3 py-4 text-right font-mono text-sm tabular-nums text-foreground">
                          {journal.exit_price != null ? formatCurrency(journal.exit_price) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-left text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                            {new Date(journal.trade_date).toLocaleDateString("ko-KR")}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right">
                          <JournalPnlCell journal={journal} quote={quoteMap.get(journal.id)} />
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={cn(
                                "inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                journal.exit_price == null
                                  ? "bg-warning-muted text-warning"
                                  : "bg-secondary text-muted-foreground"
                              )}
                            >
                              {journal.exit_price == null ? "진행 중" : "청산"}
                            </span>
                            <span
                              className={cn(
                                "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                journal.is_principle
                                  ? "bg-profit-muted text-profit"
                                  : "bg-loss-muted text-loss"
                              )}
                            >
                              {journal.is_principle ? (
                                <BadgeCheck className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}
                              {journal.is_principle ? "원칙" : "뇌동"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/journal/${journal.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title={canWrite ? "수정" : "상세 보기"}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                            {canWrite ? (
                              <button
                                onClick={(e) => handleDelete(e, journal.id)}
                                disabled={deletingId === journal.id}
                                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-loss hover:bg-loss/10 transition-colors disabled:opacity-40"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length > PAGE_SIZE ? (
              <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-muted-foreground">
                  {filtered.length}건 중 {(safePage - 1) * PAGE_SIZE + 1}-
                  {Math.min(safePage * PAGE_SIZE, filtered.length)} 표시
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  >
                    이전
                  </button>
                  {pageNumbers.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium",
                        n === safePage
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  >
                    다음
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
        </div>
    </>
  );
}
