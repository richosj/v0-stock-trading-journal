import type { OwnerKey } from './auth/shared'

export type TradingJournalFill = {
  id: string
  journal_id: string
  owner_key: OwnerKey
  fill_type: 'buy' | 'sell'
  price: number
  quantity: number
  fill_date: string
  memo: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type NewTradingJournalFill = Omit<
  TradingJournalFill,
  'id' | 'created_at' | 'updated_at' | 'owner_key'
>

export type TradingJournal = {
  id: string
  owner_key: OwnerKey
  ticker: string
  company_name: string
  trade_type: 'buy' | 'sell'
  entry_price: number
  quantity: number
  target_price: number
  stop_loss: number
  trade_date: string
  reason: string
  strategy: string[]
  is_principle: boolean
  status: 'open' | 'closed'
  exit_price: number | null
  exit_date: string | null
  pnl: number | null
  pnl_percent: number | null
  scenario_notes: string | null
  principle_notes: string | null
  created_at: string
  updated_at: string
  fills?: TradingJournalFill[]
}

export type NewTradingJournal = Omit<
  TradingJournal,
  'id' | 'created_at' | 'updated_at' | 'fills' | 'owner_key'
>
