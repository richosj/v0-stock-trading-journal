import type {
  NewTradingJournal,
  NewTradingJournalFill,
  TradingJournal,
  TradingJournalFill,
} from './supabase'

const integerFormatter = new Intl.NumberFormat('ko-KR')
const decimalFormatter = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeStrategy(strategy: string[] | null | undefined) {
  const cleaned = (strategy ?? [])
    .map((item) => item.trim())
    .filter(Boolean)

  return cleaned.length > 0 ? cleaned : ['일반']
}

function sortFills<T extends Pick<TradingJournalFill, 'fill_date' | 'sort_order' | 'created_at'>>(
  fills: T[]
) {
  return [...fills].sort((left, right) => {
    const dateDiff = new Date(left.fill_date).getTime() - new Date(right.fill_date).getTime()
    if (dateDiff !== 0) return dateDiff

    const orderDiff = left.sort_order - right.sort_order
    if (orderDiff !== 0) return orderDiff

    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  })
}

function normalizeBaseJournal(journal: NewTradingJournal): NewTradingJournal {
  return {
    ...journal,
    ticker: journal.ticker.trim().toUpperCase(),
    company_name: journal.company_name.trim(),
    reason: journal.reason?.trim() ?? '',
    strategy: normalizeStrategy(journal.strategy),
    target_price: Number(journal.target_price) || 0,
    stop_loss: Number(journal.stop_loss) || 0,
    scenario_notes: normalizeText(journal.scenario_notes),
    principle_notes: normalizeText(journal.principle_notes),
  }
}

export function calculateJournalMetrics(
  journal: Pick<NewTradingJournal, 'entry_price' | 'quantity' | 'exit_price'>
) {
  if (
    journal.exit_price == null ||
    journal.exit_price <= 0 ||
    journal.entry_price <= 0 ||
    journal.quantity <= 0
  ) {
    return null
  }

  const unitProfit = journal.exit_price - journal.entry_price

  const pnl = roundToTwo(unitProfit * journal.quantity)
  const costBasis = journal.entry_price * journal.quantity
  const pnlPercent = costBasis > 0 ? roundToTwo((pnl / costBasis) * 100) : 0

  return {
    pnl,
    pnl_percent: pnlPercent,
  }
}

export function calculateAverageCostRollup(
  fills: Pick<TradingJournalFill, 'fill_type' | 'price' | 'quantity' | 'fill_date' | 'sort_order' | 'created_at'>[]
) {
  let openQuantity = 0
  let openCost = 0
  let totalBoughtQuantity = 0
  let totalBoughtCost = 0
  let totalSoldQuantity = 0
  let realizedPnl = 0
  let lastSellPrice: number | null = null
  let lastSellDate: string | null = null

  for (const fill of sortFills(fills)) {
    if (fill.fill_type === 'buy') {
      openQuantity += fill.quantity
      openCost += fill.price * fill.quantity
      totalBoughtQuantity += fill.quantity
      totalBoughtCost += fill.price * fill.quantity
      continue
    }

    if (openQuantity <= 0) {
      continue
    }

    const sellQuantity = Math.min(fill.quantity, openQuantity)
    const averageCost = openCost / openQuantity

    realizedPnl += (fill.price - averageCost) * sellQuantity
    openQuantity -= sellQuantity
    openCost -= averageCost * sellQuantity
    totalSoldQuantity += sellQuantity
    lastSellPrice = fill.price
    lastSellDate = fill.fill_date

    if (openQuantity === 0) {
      openCost = 0
    }
  }

  const averageEntryPrice = openQuantity > 0 ? openCost / openQuantity : 0
  const averageBuyPrice = totalBoughtQuantity > 0 ? totalBoughtCost / totalBoughtQuantity : 0
  const realizedPnlPercent =
    totalBoughtCost > 0 ? (realizedPnl / totalBoughtCost) * 100 : 0

  return {
    totalBoughtQuantity,
    totalBoughtCost,
    totalSoldQuantity,
    openQuantity,
    openCost,
    averageBuyPrice: roundToTwo(averageBuyPrice),
    averageEntryPrice: roundToTwo(averageEntryPrice),
    realizedPnl: roundToTwo(realizedPnl),
    realizedPnlPercent: roundToTwo(realizedPnlPercent),
    lastSellPrice: lastSellPrice != null ? roundToTwo(lastSellPrice) : null,
    lastSellDate,
  }
}

export function buildJournalSummaryFromFills(
  journal: Pick<
    NewTradingJournal,
    'ticker' | 'company_name' | 'target_price' | 'stop_loss' | 'trade_date' | 'reason' | 'strategy' | 'is_principle' | 'scenario_notes' | 'principle_notes'
  >,
  fills: TradingJournalFill[] | NewTradingJournalFill[]
): NewTradingJournal {
  const normalized = normalizeBaseJournal({
    ...journal,
    trade_type: 'buy',
    entry_price: 0,
    quantity: 0,
    status: 'open',
    exit_price: null,
    exit_date: null,
    pnl: null,
    pnl_percent: null,
  })
  const normalizedFills: Pick<
    TradingJournalFill,
    'fill_type' | 'price' | 'quantity' | 'fill_date' | 'sort_order' | 'created_at'
  >[] = fills.map((fill) => ({
    fill_type: fill.fill_type,
    price: fill.price,
    quantity: fill.quantity,
    fill_date: fill.fill_date,
    sort_order: fill.sort_order,
    created_at: 'created_at' in fill ? fill.created_at : new Date().toISOString(),
  }))

  const rollup = calculateAverageCostRollup(normalizedFills)

  const firstBuyFill = sortFills(
    normalizedFills.filter((fill) => fill.fill_type === 'buy')
  )[0]

  const isClosed = rollup.openQuantity === 0 && rollup.totalBoughtQuantity > 0

  return {
    ...normalized,
    trade_type: 'buy',
    entry_price: rollup.averageBuyPrice || firstBuyFill?.price || 0,
    quantity: rollup.openQuantity,
    trade_date: firstBuyFill?.fill_date || normalized.trade_date,
    status: isClosed ? 'closed' : 'open',
    exit_price: isClosed ? rollup.lastSellPrice : null,
    exit_date: isClosed ? rollup.lastSellDate : null,
    pnl: rollup.totalSoldQuantity > 0 ? rollup.realizedPnl : null,
    pnl_percent: rollup.totalSoldQuantity > 0 ? rollup.realizedPnlPercent : null,
  }
}

export function buildJournalPayload(journal: NewTradingJournal): NewTradingJournal {
  const normalized = normalizeBaseJournal(journal)
  const hasSellPrice = normalized.exit_price != null && normalized.exit_price > 0

  if (!hasSellPrice) {
    return {
      ...normalized,
      trade_type: 'buy',
      status: 'open',
      exit_price: null,
      exit_date: null,
      pnl: null,
      pnl_percent: null,
    }
  }

  const metrics = calculateJournalMetrics(normalized)

  return {
    ...normalized,
    trade_type: 'buy',
    status: 'closed',
    exit_date: normalized.exit_date || new Date().toISOString().slice(0, 10),
    pnl: metrics?.pnl ?? null,
    pnl_percent: metrics?.pnl_percent ?? null,
  }
}

export function buildJournalUpdatePayload(
  current: TradingJournal,
  updates: Partial<NewTradingJournal>
): NewTradingJournal {
  return buildJournalPayload({
    ticker: updates.ticker ?? current.ticker,
    company_name: updates.company_name ?? current.company_name,
    trade_type: 'buy',
    entry_price: updates.entry_price ?? current.entry_price,
    quantity: updates.quantity ?? current.quantity,
    target_price: updates.target_price ?? current.target_price,
    stop_loss: updates.stop_loss ?? current.stop_loss,
    trade_date: updates.trade_date ?? current.trade_date,
    reason: updates.reason ?? current.reason,
    strategy: updates.strategy ?? current.strategy,
    is_principle: updates.is_principle ?? current.is_principle,
    status: updates.status ?? current.status,
    exit_price:
      updates.exit_price === undefined ? current.exit_price : updates.exit_price,
    exit_date: updates.exit_date === undefined ? current.exit_date : updates.exit_date,
    pnl: updates.pnl === undefined ? current.pnl : updates.pnl,
    pnl_percent:
      updates.pnl_percent === undefined ? current.pnl_percent : updates.pnl_percent,
    scenario_notes:
      updates.scenario_notes === undefined
        ? current.scenario_notes
        : updates.scenario_notes,
    principle_notes:
      updates.principle_notes === undefined
        ? current.principle_notes
        : updates.principle_notes,
  })
}

export function normalizeJournal(journal: TradingJournal): TradingJournal {
  if (journal.quantity > 0 || journal.exit_price == null) {
    return {
      ...journal,
      trade_type: 'buy',
      strategy: normalizeStrategy(journal.strategy),
      reason: journal.reason ?? '',
      status: 'open',
      exit_price: journal.quantity > 0 ? null : journal.exit_price,
      exit_date: journal.quantity > 0 ? null : journal.exit_date,
      pnl: journal.quantity > 0 ? journal.pnl : journal.pnl,
      pnl_percent: journal.quantity > 0 ? journal.pnl_percent : journal.pnl_percent,
    }
  }

  return {
    ...journal,
    trade_type: 'buy',
    status: 'closed',
    strategy: normalizeStrategy(journal.strategy),
    reason: journal.reason ?? '',
  }
}

export function formatNumber(value: number) {
  return integerFormatter.format(value)
}

export function formatDecimal(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value)
}

export function formatCurrency(value: number) {
  return `${formatDecimal(value, 2)}원`
}

export function formatSignedCurrency(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatCurrency(Math.abs(value))}`
}

export function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`
}

export function formatSignedPercent(value: number, digits = 2) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${Math.abs(value).toFixed(digits)}%`
}

export function sanitizeDecimalInput(value: string) {
  const stripped = value.replace(/,/g, '').replace(/[^\d.-]/g, '')
  const sign = stripped.startsWith('-') ? '-' : ''
  const unsigned = stripped.replace(/-/g, '')
  const firstDotIndex = unsigned.indexOf('.')

  if (firstDotIndex === -1) {
    return `${sign}${unsigned}`
  }

  const integerPart = unsigned.slice(0, firstDotIndex)
  const decimalPart = unsigned.slice(firstDotIndex + 1).replace(/\./g, '')
  return `${sign}${integerPart}.${decimalPart}`
}

export function sanitizeIntegerInput(value: string) {
  return value.replace(/[^\d]/g, '')
}

export function formatNumericInput(value: string) {
  if (!value) {
    return ''
  }

  const sign = value.startsWith('-') ? '-' : ''
  const unsignedValue = sign ? value.slice(1) : value
  const [integerPart, decimalPart] = unsignedValue.split('.')
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || '0'
  const formattedInteger = integerFormatter.format(Number(normalizedInteger))

  if (decimalPart === undefined) {
    return `${sign}${formattedInteger}`
  }

  return `${sign}${formattedInteger}.${decimalPart}`
}

export function formatQuantity(value: number) {
  return `${formatNumber(value)}주`
}

export function formatCompactCount(value: number) {
  return decimalFormatter.format(value)
}
