"use client";

import { useState } from "react";
import {
  ArrowUpDown,
  Search,
  Filter,
  Pencil,
  Trash2,
  CalendarClock,
  CircleDollarSign,
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

interface JournalTableProps {
  journals: TradingJournal[];
  canWrite: boolean;
}

type FilterType = "전체" | "open" | "closed";

export function JournalTable({ journals: initialJournals, canWrite }: JournalTableProps) {
  const [journals, setJournals] = useState(initialJournals);
  const [filter, setFilter] = useState<FilterType>("전체");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"trade_date" | "pnl_percent">("trade_date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const filtered = journals
    .filter((j) => {
      if (filter === "open") return j.exit_price == null;
      if (filter === "closed") return j.exit_price != null;
      return true;
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
      const diff = (b.pnl_percent ?? 0) - (a.pnl_percent ?? 0);
      return sortDir === "desc" ? diff : -diff;
    });

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
            <div className="flex rounded-lg border border-border overflow-hidden self-start">
              {(["전체", "open", "closed"] as FilterType[]).map((f) => {
                const label = f === "전체" ? "전체" : f === "open" ? "매도 전" : "매도 완료";
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
                    {label}
                  </button>
                );
              })}
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
              {filtered.map((journal) => {
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
                        <p className="truncate font-semibold text-foreground">
                          {journal.company_name}
                        </p>
                        <p className="mt-1 text-xs font-mono text-muted-foreground">
                          {journal.ticker || "티커 미입력"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getOwnerLabel(journal.owner_key)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          journal.is_principle
                            ? "bg-profit-muted text-profit"
                            : "bg-loss-muted text-loss"
                        )}
                      >
                        {journal.is_principle ? "원칙" : "뇌동"}
                      </span>
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
                      <div>
                        <p className="text-[11px] text-muted-foreground">손익률</p>
                        <p
                          className={cn(
                            "mt-1 text-sm font-semibold",
                            hasRealizedResult
                              ? isProfitable
                                ? "text-profit"
                                : "text-loss"
                              : "text-muted-foreground"
                          )}
                        >
                          {hasRealizedResult
                            ? formatSignedPercent(journal.pnl_percent ?? 0, 2)
                            : "-"}
                        </p>
                        {hasRealizedResult && (
                          <p className="mt-1 text-xs font-mono text-muted-foreground">
                            {formatSignedCurrency(journal.pnl ?? 0)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
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
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/60">
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">
                      종목명
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
                        손익률
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground">
                      원칙
                    </th>
                    <th className="px-3 py-3 text-xs font-medium text-muted-foreground text-right">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((journal) => {
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
                        <td className="px-6 py-4">
                          <Link href={`/journal/${journal.id}`} className="block hover:opacity-80">
                            <div>
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {journal.company_name}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                {journal.ticker}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {getOwnerLabel(journal.owner_key)}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-4 text-right font-mono text-sm text-foreground">
                          {formatCurrency(journal.entry_price)}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <span className="inline-flex items-center gap-1 font-mono text-sm text-foreground">
                            <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatCurrency(journal.entry_price)}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right font-mono text-sm text-foreground">
                          {formatQuantity(journal.quantity)}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <span className="font-mono text-sm text-foreground">
                            {journal.exit_price != null ? formatCurrency(journal.exit_price) : "-"}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-xs font-mono text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {new Date(journal.trade_date).toLocaleDateString("ko-KR")}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right">
                          <div>
                            <p
                              className={cn(
                                "font-mono font-semibold text-sm",
                                hasRealizedResult
                                  ? isProfitable
                                    ? "text-profit"
                                    : "text-loss"
                                  : "text-muted-foreground"
                              )}
                            >
                              {hasRealizedResult
                                ? formatSignedPercent(journal.pnl_percent ?? 0, 2)
                                : "-"}
                            </p>
                            {hasRealizedResult && (
                              <p className="text-xs font-mono text-muted-foreground">
                                {formatSignedCurrency(journal.pnl ?? 0)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
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
                            {journal.is_principle ? "원칙매매" : "뇌동매매"}
                          </span>
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
          </>
        )}
        </div>
    </>
  );
}
