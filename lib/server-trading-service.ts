import 'server-only'

import { type AuthSession } from '@/lib/auth/shared'
import { assertWritableSession } from '@/lib/auth/server'
import { HttpError } from '@/lib/http-error'
import { getServerSupabase } from '@/lib/server-supabase'
import type {
  NewTradingJournal,
  NewTradingJournalFill,
  TradingJournal,
  TradingJournalFill,
} from '@/lib/supabase'
import {
  calculateAverageCostRollup,
  buildJournalPayload,
  buildJournalSummaryFromFills,
  buildJournalUpdatePayload,
  normalizeJournal,
} from '@/lib/trading-calculations'

async function getJournalRecordForSession(session: AuthSession, journalId: string) {
  const supabase = getServerSupabase()
  let query = supabase.from('trading_journals').select('*').eq('id', journalId)

  if (!session.canReadAll && session.ownerKey) {
    query = query.eq('owner_key', session.ownerKey)
  }

  const { data, error } = await query.single()

  if (error || !data) {
    throw new HttpError(404, '일지를 찾을 수 없습니다.')
  }

  return data as TradingJournal
}

export async function listJournalsForSession(session: AuthSession) {
  const supabase = getServerSupabase()
  let query = supabase
    .from('trading_journals')
    .select('*')
    .order('trade_date', { ascending: false })

  if (!session.canReadAll && session.ownerKey) {
    query = query.eq('owner_key', session.ownerKey)
  }

  const { data, error } = await query

  if (error) {
    throw new HttpError(500, '일지 목록을 불러오지 못했습니다.')
  }

  return (data ?? []).map((journal) => normalizeJournal(journal as TradingJournal))
}

export async function getJournalByIdForSession(session: AuthSession, journalId: string) {
  const journal = await getJournalRecordForSession(session, journalId)
  return normalizeJournal(journal)
}

export async function createJournalForSession(
  session: AuthSession,
  journal: NewTradingJournal
) {
  assertWritableSession(session)

  if (!session.ownerKey) {
    throw new HttpError(403, '소유자 정보가 없습니다.')
  }

  const supabase = getServerSupabase()
  const payload = {
    ...buildJournalPayload(journal),
    owner_key: session.ownerKey,
  }

  const { data, error } = await supabase
    .from('trading_journals')
    .insert([payload])
    .select('*')
    .single()

  if (error || !data) {
    throw new HttpError(500, '일지 저장에 실패했습니다.')
  }

  const fills: Array<NewTradingJournalFill & { owner_key: NonNullable<typeof session.ownerKey> }> = [
    {
      journal_id: data.id,
      owner_key: session.ownerKey,
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
      owner_key: session.ownerKey,
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
    throw new HttpError(500, '체결 내역 저장에 실패했습니다.')
  }

  return syncJournalSummaryForSession(session, data.id)
}

export async function updateJournalForSession(
  session: AuthSession,
  journalId: string,
  updates: Partial<NewTradingJournal>
) {
  assertWritableSession(session)

  const supabase = getServerSupabase()
  const currentJournal = await getJournalRecordForSession(session, journalId)
  const payload = buildJournalUpdatePayload(normalizeJournal(currentJournal), updates)

  let query = supabase
    .from('trading_journals')
    .update(payload)
    .eq('id', journalId)

  if (session.ownerKey) {
    query = query.eq('owner_key', session.ownerKey)
  }

  const { data, error } = await query.select('*').single()

  if (error || !data) {
    throw new HttpError(500, '일지 수정에 실패했습니다.')
  }

  return normalizeJournal(data as TradingJournal)
}

export async function deleteJournalForSession(session: AuthSession, journalId: string) {
  assertWritableSession(session)

  const supabase = getServerSupabase()
  let query = supabase.from('trading_journals').delete().eq('id', journalId)

  if (session.ownerKey) {
    query = query.eq('owner_key', session.ownerKey)
  }

  const { error } = await query

  if (error) {
    throw new HttpError(500, '일지 삭제에 실패했습니다.')
  }

  return true
}

export async function listJournalFillsForSession(
  session: AuthSession,
  journalId: string
) {
  await getJournalRecordForSession(session, journalId)

  const supabase = getServerSupabase()
  let query = supabase
    .from('trading_journal_fills')
    .select('*')
    .eq('journal_id', journalId)
    .order('fill_date', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (!session.canReadAll && session.ownerKey) {
    query = query.eq('owner_key', session.ownerKey)
  }

  const { data, error } = await query

  if (error) {
    throw new HttpError(500, '체결 내역을 불러오지 못했습니다.')
  }

  return (data ?? []) as TradingJournalFill[]
}

export async function createJournalFillForSession(
  session: AuthSession,
  journalId: string,
  fill: NewTradingJournalFill
) {
  assertWritableSession(session)

  if (!session.ownerKey) {
    throw new HttpError(403, '소유자 정보가 없습니다.')
  }

  await getJournalRecordForSession(session, journalId)
  const currentFills = await listJournalFillsForSession(session, journalId)
  const rollup = calculateAverageCostRollup(currentFills)

  if (fill.fill_type === 'sell' && fill.quantity > rollup.openQuantity) {
    throw new HttpError(400, '현재 보유 수량보다 많이 매도할 수 없습니다.')
  }

  const supabase = getServerSupabase()
  const { error } = await supabase.from('trading_journal_fills').insert([
    {
      ...fill,
      journal_id: journalId,
      owner_key: session.ownerKey,
      memo: fill.memo?.trim() || null,
    },
  ])

  if (error) {
    throw new HttpError(500, '체결 추가에 실패했습니다.')
  }

  return syncJournalSummaryForSession(session, journalId)
}

export async function deleteJournalFillForSession(
  session: AuthSession,
  journalId: string,
  fillId: string
) {
  assertWritableSession(session)

  const currentFills = await listJournalFillsForSession(session, journalId)

  if (currentFills.length <= 1) {
    throw new HttpError(400, '최소 1개의 매수 체결은 남아 있어야 합니다.')
  }

  const supabase = getServerSupabase()
  let query = supabase
    .from('trading_journal_fills')
    .delete()
    .eq('id', fillId)
    .eq('journal_id', journalId)

  if (session.ownerKey) {
    query = query.eq('owner_key', session.ownerKey)
  }

  const { error } = await query

  if (error) {
    throw new HttpError(500, '체결 삭제에 실패했습니다.')
  }

  return syncJournalSummaryForSession(session, journalId)
}

export async function syncJournalSummaryForSession(
  session: AuthSession,
  journalId: string
) {
  assertWritableSession(session)

  const journal = await getJournalRecordForSession(session, journalId)
  const fills = await listJournalFillsForSession(session, journalId)

  if (fills.length === 0) {
    throw new HttpError(400, '체결 내역이 없어 요약을 계산할 수 없습니다.')
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

  const supabase = getServerSupabase()
  let query = supabase
    .from('trading_journals')
    .update(payload)
    .eq('id', journalId)

  if (session.ownerKey) {
    query = query.eq('owner_key', session.ownerKey)
  }

  const { data, error } = await query.select('*').single()

  if (error || !data) {
    throw new HttpError(500, '일지 요약 동기화에 실패했습니다.')
  }

  return normalizeJournal(data as TradingJournal)
}

export async function getJournalStatsForSession(session: AuthSession) {
  const journals = await listJournalsForSession(session)

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
      rollup: calculateAverageCostRollup(
        await listJournalFillsForSession(session, journal.id)
      ),
    }))
  )

  const closedJournals = fillRollups.filter(
    ({ rollup }) => rollup.openQuantity === 0 && rollup.totalBoughtQuantity > 0
  )
  const wins = closedJournals.filter(({ rollup }) => rollup.realizedPnl > 0).length
  const winRate = closedJournals.length > 0 ? (wins / closedJournals.length) * 100 : 0
  const principleJournals = journals.filter((journal) => journal.is_principle).length
  const principleRate =
    journals.length > 0 ? (principleJournals / journals.length) * 100 : 0
  const totalPnL = fillRollups.reduce((sum, { rollup }) => sum + rollup.realizedPnl, 0)
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
}
