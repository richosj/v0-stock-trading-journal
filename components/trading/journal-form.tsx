"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { createJournal } from "@/lib/trading-service";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  calculateJournalMetrics,
  formatNumericInput,
  formatSignedCurrency,
  formatSignedPercent,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from "@/lib/trading-calculations";

const PRESET_TAGS = [
  "차트 돌파",
  "실적 기대",
  "가치 저평가",
  "뉴스 호재",
  "이벤트 기대",
  "외국인 매수",
  "AI 테마",
  "반도체",
];

const SCENARIO_TEMPLATES = [
  {
    title: "실적 모멘텀",
    content:
      "실적 기대감이 있는 구간입니다. 진입 이유, 손절 기준, 목표가와 시나리오를 먼저 적고 진입합니다.",
  },
  {
    title: "돌파 매매",
    content:
      "중요 저항 돌파 구간입니다. 거래량 증가 여부와 손절 기준을 확인한 뒤 계획대로 대응합니다.",
  },
  {
    title: "눌림목",
    content:
      "상승 추세 내 눌림목 구간입니다. 평균단가 관리와 재진입 기준을 함께 기록합니다.",
  },
];

const RECENT_TAGS_KEY = "trading_journal_recent_tags";

type SymbolSearchResult = {
  symbol: string;
  name: string;
  exchange: string | null;
};

export function JournalForm() {
  const router = useRouter();
  const [quickMode, setQuickMode] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [ticker, setTicker] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const [isPrinciple, setIsPrinciple] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [symbolResults, setSymbolResults] = useState<SymbolSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const previewMetrics = calculateJournalMetrics({
    entry_price: Number(entryPrice) || 0,
    quantity: Number(quantity) || 0,
    exit_price: Number(sellPrice) || null,
  });

  const advancedVisible = !quickMode || showAdvanced;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(RECENT_TAGS_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentTags(parsed.filter((tag) => typeof tag === "string").slice(0, 8));
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    const source = ticker.trim() || companyName.trim();
    const normalized = source.trim();

    if (normalized.length < 2) {
      setSymbolResults([]);
      return;
    }

    setSearchQuery(normalized);
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(
          `/api/symbol-search?q=${encodeURIComponent(normalized)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("종목 검색 실패");
        }

        const payload = await response.json();
        setSymbolResults(payload.items ?? []);
        setShowSuggestions(true);
      } catch {
        setSymbolResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [companyName, ticker]);

  const selectedTagSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const rememberTags = (tags: string[]) => {
    const next = [...new Set([...tags, ...recentTags])].slice(0, 10);
    setRecentTags(next);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(RECENT_TAGS_KEY, JSON.stringify(next));
    }
  };

  const addCustomTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      const next = [...selectedTags, trimmed];
      setSelectedTags(next);
      rememberTags([trimmed]);
      setCustomTag("");
    }
  };

  const applyScenarioTemplate = (content: string) => {
    setReason(content);
    toast.success("시나리오 템플릿을 채웠습니다.");
  };

  const applySymbolSuggestion = (item: SymbolSearchResult) => {
    setCompanyName(item.name);
    setTicker(item.symbol.replace(".KS", "").replace(".KQ", ""));
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !entryPrice || !quantity || !tradeDate) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const nextTags = selectedTags.length > 0 ? selectedTags : ["일반"];
      const result = await createJournal({
        ticker: ticker.trim().toUpperCase(),
        company_name: companyName,
        trade_type: "buy",
        entry_price: Number(entryPrice),
        quantity: Number(quantity),
        target_price: Number(targetPrice) || 0,
        stop_loss: Number(stopLoss) || 0,
        trade_date: tradeDate,
        reason,
        strategy: nextTags,
        is_principle: isPrinciple,
        status: Number(sellPrice) > 0 ? "closed" : "open",
        exit_price: Number(sellPrice) || null,
        exit_date: Number(sellPrice) > 0 ? new Date().toISOString().slice(0, 10) : null,
        pnl: previewMetrics?.pnl ?? null,
        pnl_percent: previewMetrics?.pnl_percent ?? null,
        scenario_notes: null,
        principle_notes: null,
      });

      if (result) {
        rememberTags(nextTags);
        toast.success("매매 일지가 저장되었습니다!");
        setCompanyName("");
        setTicker("");
        setEntryPrice("");
        setQuantity("");
        setSellPrice("");
        setTargetPrice("");
        setStopLoss("");
        setTradeDate(new Date().toISOString().slice(0, 10));
        setReason("");
        setSelectedTags([]);
        setIsPrinciple(true);
        setShowAdvanced(false);
        router.push("/journal");
      } else {
        toast.error("저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error creating journal:", error);
      toast.error("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden max-w-5xl">
      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">입력 모드</p>
            <p className="mt-1 text-xs text-muted-foreground">
              모바일에서는 빠른 입력으로, 필요할 때만 상세 옵션을 펼치세요.
            </p>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setQuickMode(true);
                setShowAdvanced(false);
              }}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors",
                quickMode
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              빠른 입력
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickMode(false);
                setShowAdvanced(true);
              }}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors",
                !quickMode
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              전체 입력
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              종목명 <span className="text-loss">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="예: 엔비디아"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {showSuggestions && (searchLoading || symbolResults.length > 0) ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-border bg-card p-2 shadow-lg">
                {searchLoading ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground">종목 검색 중...</p>
                ) : (
                  symbolResults.map((item) => (
                    <button
                      key={`${item.symbol}-${item.name}`}
                      type="button"
                      onClick={() => applySymbolSuggestion(item)}
                      className="flex w-full items-start justify-between rounded-lg px-3 py-2 text-left hover:bg-secondary/40"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.symbol}
                          {item.exchange ? ` · ${item.exchange}` : ""}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              티커 (선택)
            </label>
            <input
              type="text"
              placeholder="예: AAPL / 005930"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              평균 매수가 <span className="text-loss">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={formatNumericInput(entryPrice)}
              onChange={(e) => setEntryPrice(sanitizeDecimalInput(e.target.value))}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              수량 (주) <span className="text-loss">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatNumericInput(quantity)}
              onChange={(e) => setQuantity(sanitizeIntegerInput(e.target.value))}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">매도가</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={formatNumericInput(sellPrice)}
              onChange={(e) => setSellPrice(sanitizeDecimalInput(e.target.value))}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-xs font-medium text-muted-foreground">
              진입 날짜 <span className="text-loss">*</span>
            </label>
            <input
              type="date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              title="진입 날짜"
              aria-label="진입 날짜"
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:light]"
              required
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <p className="text-[11px] font-medium text-muted-foreground">자동 손익</p>
              <p className="mt-2 text-base font-bold font-mono text-foreground">
                {previewMetrics ? formatSignedCurrency(previewMetrics.pnl) : "-"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {previewMetrics ? formatSignedPercent(previewMetrics.pnl_percent, 2) : "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium text-muted-foreground">
                  시나리오 템플릿
                </label>
                {quickMode ? (
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {advancedVisible ? "상세 옵션 접기" : "상세 옵션 열기"}
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {SCENARIO_TEMPLATES.map((template) => (
                  <button
                    key={template.title}
                    type="button"
                    onClick={() => applyScenarioTemplate(template.content)}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {template.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                왜 샀는가? — 매매 이유 및 시나리오
              </label>
              <textarea
                placeholder="예: 돌파 구간, 거래량 증가, 손절 기준은 전일 저점."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={quickMode ? 4 : 6}
                className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none leading-relaxed"
              />
            </div>
          </div>

          <div className="space-y-4">
            {advancedVisible ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">목표가</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={formatNumericInput(targetPrice)}
                      onChange={(e) => setTargetPrice(sanitizeDecimalInput(e.target.value))}
                      className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-profit placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-profit/40"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">손절가</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={formatNumericInput(stopLoss)}
                      onChange={(e) => setStopLoss(sanitizeDecimalInput(e.target.value))}
                      className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-loss placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-loss/40"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    매매 유형 <span className="text-loss">*</span>
                  </label>
                  <div className="flex rounded-lg border border-border overflow-hidden h-[38px]">
                    <button
                      type="button"
                      onClick={() => setIsPrinciple(true)}
                      className={cn(
                        "flex-1 text-sm font-medium transition-colors",
                        isPrinciple
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      원칙매매
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrinciple(false)}
                      className={cn(
                        "flex-1 text-sm font-medium transition-colors",
                        !isPrinciple
                          ? "bg-loss text-white"
                          : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      뇌동매매
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-secondary/15 p-4 text-sm text-muted-foreground">
                빠른 입력 모드입니다. 목표가, 손절가, 매매 유형은 상세 옵션에서 보완할 수 있습니다.
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                최근 / 추천 태그
              </label>
              <div className="flex flex-wrap gap-2">
                {[...recentTags, ...PRESET_TAGS.filter((tag) => !recentTags.includes(tag))]
                  .slice(0, 12)
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                        selectedTagSet.has(tag)
                          ? "bg-primary/15 text-primary border-primary/40"
                          : "bg-secondary/60 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            매매 전략 태그
          </label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              placeholder="직접 태그 입력..."
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
              className="flex-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="button"
              onClick={addCustomTag}
              className="px-3 py-2 rounded-lg border border-border bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xs"
            >
              추가
            </button>
          </div>
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    title={`${tag} 태그 제거`}
                    aria-label={`${tag} 태그 제거`}
                    className="hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="hidden justify-end pt-4 sm:flex">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "저장 중..." : "일지 저장"}
          </button>
        </div>

        <div className="sticky bottom-3 z-20 sm:hidden">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "저장 중..." : "빠르게 저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
