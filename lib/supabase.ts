import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nzzaspeqnardonydimzn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56emFzcGVxbmFyZG9ueWRpbXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzI5NjYsImV4cCI6MjA5Mzc0ODk2Nn0.h0VjwKbLYAOSxRUmpKIwX6Lg8q6SvuaYX2jnCW7tV1k'

export const supabase = createClient(supabaseUrl, supabaseKey)

export function getSupabase() {
  return supabase
}

export type TradingJournal = {
  id: string
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
}

export type NewTradingJournal = Omit<TradingJournal, 'id' | 'created_at' | 'updated_at'>
