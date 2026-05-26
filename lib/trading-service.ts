import type {
  NewTradingJournal,
  NewTradingJournalFill,
  TradingJournal,
  TradingJournalFill,
} from './supabase'

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error || '요청 처리에 실패했습니다.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export async function fetchAllJournals(): Promise<TradingJournal[]> {
  const payload = await requestJson<{ journals: TradingJournal[] }>('/api/journals')
  return payload.journals
}

export async function fetchJournalById(id: string): Promise<TradingJournal | null> {
  const payload = await requestJson<{ journal: TradingJournal }>(`/api/journals/${id}`)
  return payload.journal
}

export async function createJournal(journal: NewTradingJournal): Promise<TradingJournal | null> {
  const payload = await requestJson<{ journal: TradingJournal }>('/api/journals', {
    method: 'POST',
    body: JSON.stringify(journal),
  })

  return payload.journal
}

export async function updateJournal(
  id: string,
  updates: Partial<NewTradingJournal>
): Promise<TradingJournal | null> {
  const payload = await requestJson<{ journal: TradingJournal }>(`/api/journals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })

  return payload.journal
}

export async function deleteJournal(id: string): Promise<boolean> {
  await requestJson<{ success: boolean }>(`/api/journals/${id}`, {
    method: 'DELETE',
  })
  return true
}

export async function fetchJournalFills(journalId: string): Promise<TradingJournalFill[]> {
  const payload = await requestJson<{ fills: TradingJournalFill[] }>(
    `/api/journals/${journalId}/fills`
  )
  return payload.fills
}

export async function createJournalFill(
  fill: NewTradingJournalFill
): Promise<TradingJournal | null> {
  const payload = await requestJson<{ journal: TradingJournal }>(
    `/api/journals/${fill.journal_id}/fills`,
    {
      method: 'POST',
      body: JSON.stringify(fill),
    }
  )

  return payload.journal
}

export async function deleteJournalFill(
  journalId: string,
  fillId: string
): Promise<TradingJournal | null> {
  const payload = await requestJson<{ journal: TradingJournal }>(
    `/api/journals/${journalId}/fills/${fillId}`,
    {
      method: 'DELETE',
    }
  )

  return payload.journal
}

export async function getJournalStats() {
  const payload = await requestJson<{
    stats: {
      totalPnL: number
      totalPnLPercent: number
      winRate: number
      principleRate: number
      openPositions: number
    }
  }>('/api/stats')

  return payload.stats
}
