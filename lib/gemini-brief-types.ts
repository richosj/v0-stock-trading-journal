export type AiWatchItem = {
  name: string
  ticker: string
  reason: string
  risk: string
  relation: string | null
}

export type AiHoldingNote = {
  name: string
  ticker: string
  note: string
}

export type DailyAiBrief = {
  summary: string
  marketMood: "risk-on" | "risk-off" | "mixed"
  watchlist: AiWatchItem[]
  holdingsNotes: AiHoldingNote[]
  caution: string
  generatedAt: string
  source?: "gemini" | "fallback"
  notice?: string | null
}
