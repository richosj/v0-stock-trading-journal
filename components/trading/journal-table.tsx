"use client";

import { useState } from "react";
import { ArrowUpDown, Search, Filter, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradingJournal } from "@/lib/supabase";
import { deleteJournal } from "@/lib/trading-service";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface JournalTableProps {
  journals: TradingJournal[];
}

type FilterType = "전체" | "open" | "closed";

function getDaysRemaining(targetDate: string): number {
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DaysBadge({ targetDate, status }: { targetDate?: string; status: string }) {
  if (status === "closed" || !targetDate) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
        {status === "closed" ? "청산" : "-"}
      </span>
    );
  }
  const days = getDaysRemaining(targetDate);
  if (days < 0) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-loss-muted text-loss border border-loss/30">
        기한초과
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-muted text-warning border border-warning/30">
        D-0
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-muted text-warning border border-warning/30">
        D-{days}
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
      D-{days}
    </span>
  );
}

export function JournalTable({ journals: initialJournals }: JournalTableProps) {
  const router = useRouter();
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
      if (filter === "open") return j.status === "open";
      if (filter === "closed") return j.status === "closed";
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
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table header controls */}
        <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-foreground">매매 일지</h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {journals.length}건
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="종목명 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-secondary/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {/* Filter */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["전체", "open", "closed"] as FilterType[]).map((f) => {
                const label = f === "전체" ? "전체" : f === "open" ? "진행중" : "청산완료";
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">
                  종목명
                </th>
                <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground">
                  구분
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
                  상태
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
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-muted-foreground text-sm"
                  >
                    <Filter className="w-5 h-5 mx-auto mb-2 opacity-40" />
                    검색 결과가 없습니다
                  </td>
                </tr>
              ) : (
                filtered.map((journal) => {
                  const isProfitable = (journal.pnl_percent ?? 0) >= 0;
                  return (
                    <tr
                      key={journal.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors group"
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
                          </div>
                        </Link>
                      </td>
                      {/* 구분 */}
                      <td className="px-3 py-4">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            journal.trade_type === "buy"
                              ? "bg-profit-muted text-profit"
                              : "bg-loss-muted text-loss"
                          )}
                        >
                          {journal.trade_type === "buy" ? "매수" : "매도"}
                        </span>
                      </td>
                      {/* 진입일 */}
                      <td className="px-3 py-4 text-xs font-mono text-muted-foreground">
                        {new Date(journal.trade_date).toLocaleDateString("ko-KR")}
                      </td>
                      {/* 손익률 */}
                      <td className="px-3 py-4 text-right">
                        <div>
                          <p
                            className={cn(
                              "font-mono font-semibold text-sm",
                              isProfitable
                                ? "text-profit"
                                : "text-loss"
                            )}
                          >
                            {journal.status === "open" ? "-" : (
                              <>
                                {isProfitable ? "+" : ""}
                                {(journal.pnl_percent ?? 0).toFixed(2)}%
                              </>
                            )}
                          </p>
                          {journal.status === "closed" && (
                            <p className="text-xs font-mono text-muted-foreground">
                              {isProfitable ? "+" : ""}
                              ₩{(journal.pnl ?? 0).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </td>
                      {/* 상태 */}
                      <td className="px-3 py-4">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            journal.status === "open"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          {journal.status === "open" ? "진행중" : "청산"}
                        </span>
                      </td>
                      {/* 원칙 */}
                      <td className="px-3 py-4">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            journal.is_principle
                              ? "bg-profit-muted text-profit"
                              : "bg-loss-muted text-loss"
                          )}
                        >
                          {journal.is_principle ? "원칙매매" : "뇌동매매"}
                        </span>
                      </td>
                      {/* 액션 */}
                      <td className="px-3 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/journal/${journal.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={(e) => handleDelete(e, journal.id)}
                            disabled={deletingId === journal.id}
                            className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-loss hover:bg-loss/10 transition-colors disabled:opacity-40"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
