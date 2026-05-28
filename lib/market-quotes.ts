import type { TradingJournal } from './supabase'

export type QuoteRequestPosition = Pick<
  TradingJournal,
  'id' | 'ticker' | 'company_name' | 'entry_price' | 'quantity'
>

export type LiveQuote = {
  journalId: string
  companyName: string
  inputTicker: string
  resolvedSymbol: string | null
  currency: string | null
  regularMarketPrice: number | null
  previousClose: number | null
  change: number | null
  changePercent: number | null
  marketTime: number | null
  error: string | null
}

export const COMPANY_SYMBOL_ALIASES: Record<string, string> = {
  '두산에너빌리티': '034020.KS',
  '삼성전자': '005930.KS',
  '삼성중공업': '010140.KS',
  '카카오': '035720.KS',
  '하이브': '352820.KS',
  '엔비디아': 'NVDA',
  '애플': 'AAPL',
  '테슬라': 'TSLA',
}

function looksLikeKrTicker(ticker: string) {
  return /^\d{6}$/.test(ticker)
}

function looksLikeGlobalTicker(ticker: string) {
  return /^[A-Za-z][A-Za-z0-9.-]{0,14}$/.test(ticker)
}

export function resolveQuoteCandidates(position: QuoteRequestPosition) {
  const rawTicker = position.ticker.trim().toUpperCase()

  if (looksLikeKrTicker(rawTicker)) {
    return [`${rawTicker}.KS`, `${rawTicker}.KQ`]
  }

  if (looksLikeGlobalTicker(rawTicker)) {
    return [rawTicker]
  }

  const alias = COMPANY_SYMBOL_ALIASES[position.company_name]
  return alias ? [alias] : []
}
