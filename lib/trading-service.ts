import {
  getSupabase,
  type TradingJournal,
  type NewTradingJournal,
  type TradingJournalFill,
  type NewTradingJournalFill,
} from './supabase'
import {
  calculateAverageCostRollup,
  buildJournalSummaryFromFills,
  buildJournalPayload,
  buildJournalUpdatePayload,
  normalizeJournal,
} from './trading-calculations'

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

  return (data || []).map(normalizeJournal)
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

  return data ? normalizeJournal(data) : null
}

export async function createJournal(
  journal: NewTradingJournal
): Promise<TradingJournal | null> {
  const supabase = getSupabase()
  const payload = buildJournalPayload(journal)
  const { data, error } = await supabase
    .from('trading_journals')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Error creating journal:', error)
    return null
  }

  if (!data) {
    return null
  }

  const fills: NewTradingJournalFill[] = [
    {
      journal_id: data.id,
      fill_type: 'buy',
      price: journal.entry_price,
      quantity: journal.quantity,
      fill_date: journal.trade_date,
      memo: '초기 매수',
      sort_order: 0,
    },
  ]

  if (journal.exit_price != null && journal.exit_price > 0) {
    fills.push({
      journal_id: data.id,
      fill_type: 'sell',
      price: journal.exit_price,
      quantity: journal.quantity,
      fill_date: journal.exit_date || journal.trade_date,
      memo: '초기 매도',
      sort_order: 1,
    })
  }

  const { error: fillError } = await supabase.from('trading_journal_fills').insert(fills)
  if (fillError) {
    console.error('Error creating journal fills:', fillError)
  }

  return syncJournalSummary(data.id)
}

export async function updateJournal(
  id: string,
  updates: Partial<NewTradingJournal>
): Promise<TradingJournal | null> {
  const supabase = getSupabase()
  const { data: currentJournal, error: fetchError } = await supabase
    .from('trading_journals')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !currentJournal) {
    console.error('Error fetching journal for update:', fetchError)
    return null
  }

  const payload = buildJournalUpdatePayload(normalizeJournal(currentJournal), updates)
  const { data, error } = await supabase
    .from('trading_journals')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating journal:', error)
    return null
  }

  return data ? normalizeJournal(data) : null
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

export async function fetchJournalFills(journalId: string): Promise<TradingJournalFill[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('trading_journal_fills')
    .select('*')
    .eq('journal_id', journalId)
    .order('fill_date', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching journal fills:', error)
    return []
  }

  return data || []
}

export async function createJournalFill(
  fill: NewTradingJournalFill
): Promise<TradingJournal | null> {
  const supabase = getSupabase()
  const { error } = await supabase.from('trading_journal_fills').insert([
    {
      ...fill,
      memo: fill.memo?.trim() || null,
    },
  ])

  if (error) {
    console.error('Error creating journal fill:', error)
    return null
  }

  return syncJournalSummary(fill.journal_id)
}

export async function deleteJournalFill(
  journalId: string,
  fillId: string
): Promise<TradingJournal | null> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('trading_journal_fills')
    .delete()
    .eq('id', fillId)

  if (error) {
    console.error('Error deleting journal fill:', error)
    return null
  }

  return syncJournalSummary(journalId)
}

export async function syncJournalSummary(journalId: string): Promise<TradingJournal | null> {
  const supabase = getSupabase()
  const [journal, fills] = await Promise.all([
    fetchJournalById(journalId),
    fetchJournalFills(journalId),
  ])

  if (!journal) {
    return null
  }

  if (fills.length === 0) {
    return journal
  }

  const payload = buildJournalSummaryFromFills(
    {
      ticker: journal.ticker,
      company_name: journal.company_name,
      target_price: journal.target_price,
      stop_loss: journal.stop_loss,
      trade_date: journal.trade_date,
      reason: journal.reason,
      strategy: journal.strategy,
      is_principle: journal.is_principle,
      scenario_notes: journal.scenario_notes,
      principle_notes: journal.principle_notes,
    },
    fills
  )

  const { data, error } = await supabase
    .from('trading_journals')
    .update(payload)
    .eq('id', journalId)
    .select('*')
    .single()

  if (error) {
    console.error('Error syncing journal summary:', error)
    return null
  }

  return data ? normalizeJournal(data) : null
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

    const fillRollups = await Promise.all(
      journals.map(async (journal) => ({
        journal,
        rollup: calculateAverageCostRollup(await fetchJournalFills(journal.id)),
      }))
    )

    const closedJournals = fillRollups.filter(
      ({ rollup }) => rollup.openQuantity === 0 && rollup.totalBoughtQuantity > 0
    )
    const wins = closedJournals.filter(({ rollup }) => rollup.realizedPnl > 0).length
    const winRate =
      closedJournals.length > 0 ? (wins / closedJournals.length) * 100 : 0
    const principleJournals = journals.filter((j) => j.is_principle).length
    const principleRate =
      journals.length > 0 ? (principleJournals / journals.length) * 100 : 0

    const totalPnL = fillRollups.reduce(
      (sum, { rollup }) => sum + rollup.realizedPnl,
      0
    )
    const totalClosedCost = fillRollups.reduce(
      (sum, { rollup }) => sum + rollup.totalBoughtCost,
      0
    )

    return {
      totalPnL,
      totalPnLPercent: totalClosedCost > 0 ? (totalPnL / totalClosedCost) * 100 : 0,
      winRate,
      principleRate,
      openPositions: fillRollups.filter(({ rollup }) => rollup.openQuantity > 0).length,
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
