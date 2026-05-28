import type { AiHoldingNote } from "@/lib/gemini-brief-types"
import type { TradingJournal } from "@/lib/supabase"
import { formatCurrency } from "@/lib/trading-calculations"

export function isOpenHolding(journal: TradingJournal) {
  return journal.exit_price == null && journal.status !== "closed"
}

function looksLikeUsTicker(ticker: string) {
  return /^[A-Za-z][A-Za-z0-9.-]{0,14}$/.test(ticker.trim())
}

function formatHoldingPrice(value: number, ticker: string) {
  if (looksLikeUsTicker(ticker)) {
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
  }
  return formatCurrency(value)
}

/** 일지에 사용자가 입력한 필드를 그대로 조합한 보유 종목 메모 */
export function buildHoldingNoteText(journal: TradingJournal): string {
  const ticker = journal.ticker?.trim() ?? ""
  const lines: string[] = []

  lines.push(
    `평균단가 ${formatHoldingPrice(journal.entry_price, ticker)} · ${journal.quantity}주`
  )

  if (journal.target_price > 0) {
    lines.push(`목표가 ${formatHoldingPrice(journal.target_price, ticker)}`)
  }
  if (journal.stop_loss > 0) {
    lines.push(`손절가 ${formatHoldingPrice(journal.stop_loss, ticker)}`)
  }

  if (journal.reason?.trim()) {
    lines.push(`진입 이유: ${journal.reason.trim()}`)
  }
  if (journal.scenario_notes?.trim()) {
    lines.push(`시나리오: ${journal.scenario_notes.trim()}`)
  }
  if (journal.principle_notes?.trim()) {
    lines.push(`원칙 메모: ${journal.principle_notes.trim()}`)
  }

  if (journal.strategy?.length) {
    lines.push(`전략 태그: ${journal.strategy.join(", ")}`)
  }

  lines.push(journal.is_principle ? "원칙 매매로 기록됨" : "뇌동 매매로 기록됨")

  const hasUserMemo =
    Boolean(journal.reason?.trim()) ||
    Boolean(journal.scenario_notes?.trim()) ||
    Boolean(journal.principle_notes?.trim()) ||
    (journal.strategy?.length ?? 0) > 0

  if (!hasUserMemo) {
    return [
      lines[0],
      "일지에 진입 이유·시나리오·원칙 메모를 적어 두면 여기에 그대로 표시됩니다.",
    ].join("\n")
  }

  return lines.join("\n")
}

export function buildHoldingsNotesFromJournals(journals: TradingJournal[]): AiHoldingNote[] {
  return journals.filter(isOpenHolding).slice(0, 8).map((journal) => ({
    name: journal.company_name,
    ticker: journal.ticker || "",
    note: buildHoldingNoteText(journal),
  }))
}

/** AI/폴백이 넣는 뻔한 문구 — 일지 기반 메모로 대체할 때 사용 */
export function isGenericHoldingNote(note: string) {
  return /평균단가.*기준으로 목표가·손절가를 다시 점검/.test(note)
}
