import { getSupabase, type TradingJournal, type NewTradingJournal } from './supabase'

export async function fetchAllJournals(): Promise<TradingJournal[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('trading_journals')
    .select('*')
    .order('trade_date', { ascending: false })

  if (error) {
    console.error('Error fetching journals:', error)
    return []
  }

  return data || []
}

export async function fetchJournalById(id: string): Promise<TradingJournal | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('trading_journals')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching journal:', error)
    return null
  }

  return data
}

export async function createJournal(
  journal: NewTradingJournal
): Promise<TradingJournal | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('trading_journals')
    .insert([journal])
    .select()
    .single()

  if (error) {
    console.error('Error creating journal:', error)
    return null
  }

  return data
}

export async function updateJournal(
  id: string,
  updates: Partial<NewTradingJournal>
): Promise<TradingJournal | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('trading_journals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating journal:', error)
    return null
  }

  return data
}

export async function deleteJournal(id: string): Promise<boolean> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('trading_journals')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting journal:', error)
    return false
  }

  return true
}

export async function getJournalStats() {
  try {
    const journals = await fetchAllJournals()

    if (journals.length === 0) {
      return {
        totalPnL: 0,
        totalPnLPercent: 0,
        winRate: 0,
        principleRate: 0,
        openPositions: 0,
      }
    }

    const closedJournals = journals.filter((j) => j.status === 'closed')
    const wins = closedJournals.filter((j) => (j.pnl || 0) > 0).length
    const winRate = closedJournals.length > 0 ? (wins / closedJournals.length) * 100 : 0
    const principleJournals = journals.filter((j) => j.is_principle).length
    const principleRate =
      journals.length > 0 ? (principleJournals / journals.length) * 100 : 0

    const totalPnL = closedJournals.reduce((sum, j) => sum + (j.pnl || 0), 0)

    return {
      totalPnL,
      totalPnLPercent: totalPnL / journals.length,
      winRate,
      principleRate,
      openPositions: journals.filter((j) => j.status === 'open').length,
    }
  } catch (error) {
    console.error('Error getting journal stats:', error)
    return {
      totalPnL: 0,
      totalPnLPercent: 0,
      winRate: 0,
      principleRate: 0,
      openPositions: 0,
    }
  }
}
