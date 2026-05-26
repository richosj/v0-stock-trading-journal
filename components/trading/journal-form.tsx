"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createJournal } from "@/lib/trading-service";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export function JournalForm() {
  const router = useRouter();
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [companyName, setCompanyName] = useState("");
  const [ticker, setTicker] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [isPrinciple, setIsPrinciple] = useState(true);
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      setCustomTag("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !entryPrice || !quantity || !tradeDate) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const result = await createJournal({
        ticker: ticker.toUpperCase() || companyName.substring(0, 3),
        company_name: companyName,
        trade_type: tradeType,
        entry_price: Number(entryPrice),
        quantity: Number(quantity),
        target_price: Number(targetPrice) || 0,
        stop_loss: Number(stopLoss) || 0,
        trade_date: tradeDate,
        reason,
        strategy: selectedTags.length > 0 ? selectedTags : ["일반"],
        is_principle: isPrinciple,
        status: "open",
        exit_price: null,
        exit_date: null,
        pnl: null,
        pnl_percent: null,
        scenario_notes: null,
        principle_notes: null,
      });

      if (result) {
        toast.success("매매 일지가 저장되었습니다!");
        // Reset form
        setCompanyName("");
        setTicker("");
        setEntryPrice("");
        setQuantity("");
        setTargetPrice("");
        setStopLoss("");
        setTradeDate(new Date().toISOString().slice(0, 10));
        setReason("");
        setSelectedTags([]);
        setIsPrinciple(true);
        // Navigate to journal list
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
    <div className="rounded-xl border border-border bg-card overflow-hidden max-w-2xl">
      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
        {/* Row 1: 종목 + 매매구분 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              종목명 <span className="text-loss">*</span>
            </label>
            <input
              type="text"
              placeholder="예: 엔비디아"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              티커 (선택)
            </label>
            <input
              type="text"
              placeholder="예: NVDA"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              매매 구분 <span className="text-loss">*</span>
            </label>
            <div className="flex rounded-lg border border-border overflow-hidden h-[38px]">
              <button
                type="button"
                onClick={() => setTradeType("buy")}
                className={cn(
                  "flex-1 text-sm font-medium transition-colors",
                  tradeType === "buy"
                    ? "bg-profit text-white"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                )}
              >
                매수
              </button>
              <button
                type="button"
                onClick={() => setTradeType("sell")}
                className={cn(
                  "flex-1 text-sm font-medium transition-colors",
                  tradeType === "sell"
                    ? "bg-loss text-white"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                )}
              >
                매도
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: 가격들 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              진입가 (원) <span className="text-loss">*</span>
            </label>
            <input
              type="number"
              placeholder="0"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              수량 (주) <span className="text-loss">*</span>
            </label>
            <input
              type="number"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              목표가 — 익절선
            </label>
            <input
              type="number"
              placeholder="0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-profit placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-profit/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              손절가 — 스탑로스
            </label>
            <input
              type="number"
              placeholder="0"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-loss placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-loss/40"
            />
          </div>
        </div>

        {/* Row 3: 진입 날짜 + 매매 원칙 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              진입 날짜 <span className="text-loss">*</span>
            </label>
            <input
              type="date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
              required
            />
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
        </div>

        {/* Row 4: 매매 이유 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            왜 샀는가? — 매매 이유 및 시나리오
          </label>
          <textarea
            placeholder="예: AI 반도체 수요 급증으로 인한 실적 기대감. B100 시리즈 출하량 예상치 초과 전망..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none leading-relaxed"
          />
        </div>

        {/* Row 5: 태그 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            매매 전략 태그
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  selectedTags.includes(tag)
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "bg-secondary/60 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
          {/* Custom tag input */}
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
                    className="hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "저장 중..." : "일지 저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
