import { COMPANY_SYMBOL_ALIASES } from "@/lib/market-quotes"

export type SymbolSearchItem = {
  symbol: string
  name: string
  exchange: string | null
}

type IndexedSymbolSearchItem = SymbolSearchItem & {
  searchKeys: string[]
}

type SecTickerEntry = {
  ticker?: string
  title?: string
}

const KRX_CORP_LIST_URL =
  "https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13"
const SEC_TICKER_LIST_URL = "https://www.sec.gov/files/company_tickers.json"
const SEARCH_RESULT_LIMIT = 8
const REMOTE_REQUEST_TIMEOUT_MS = 8000

const GLOBAL_ALIAS_KEYWORDS: Record<string, string[]> = {
  NVDA: ["nvidia", "nvidia corp"],
  AAPL: ["apple"],
  TSLA: ["tesla"],
  MSFT: ["microsoft", "마이크로소프트"],
  GOOGL: ["google", "alphabet", "구글"],
  AMZN: ["amazon", "아마존"],
  META: ["meta", "facebook", "메타", "페이스북"],
}

let krxItemsPromise: Promise<IndexedSymbolSearchItem[]> | null = null
let secItemsPromise: Promise<IndexedSymbolSearchItem[]> | null = null

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "")
}

function normalizeSymbol(value: string) {
  return value.replace(/\.(KS|KQ)$/i, "").toUpperCase()
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function mapKrxExchange(value: string) {
  const normalized = value.replace(/\s+/g, "")

  switch (normalized) {
    case "유가":
      return "KOSPI"
    case "코스닥":
      return "KOSDAQ"
    case "코넥스":
      return "KONEX"
    default:
      return value.trim() || null
  }
}

function buildIndexedItem(
  item: SymbolSearchItem,
  aliases: string[] = []
): IndexedSymbolSearchItem {
  const searchKeys = [...new Set([item.symbol, item.name, ...aliases])]
    .map(normalizeSearchText)
    .filter(Boolean)

  return {
    ...item,
    searchKeys,
  }
}

function getScore(candidate: IndexedSymbolSearchItem, query: string) {
  let score = 0

  for (const key of candidate.searchKeys) {
    if (key === query) {
      score = Math.max(score, 120)
      continue
    }

    if (key.startsWith(query)) {
      score = Math.max(score, 95)
      continue
    }

    if (key.includes(query)) {
      score = Math.max(score, 70)
    }
  }

  if (candidate.symbol === query.toUpperCase()) {
    score = Math.max(score, 130)
  }

  return score
}

function isKoreanQuery(query: string) {
  return /[가-힣]/.test(query)
}

function isNumericTickerQuery(query: string) {
  return /^\d{2,6}$/.test(query)
}

function getAbortSignal() {
  return AbortSignal.timeout(REMOTE_REQUEST_TIMEOUT_MS)
}

function buildAliasItems() {
  return Object.entries(COMPANY_SYMBOL_ALIASES).map(([name, rawSymbol]) => {
    const symbol = normalizeSymbol(rawSymbol)
    const exchange = rawSymbol.endsWith(".KS")
      ? "KOSPI"
      : rawSymbol.endsWith(".KQ")
        ? "KOSDAQ"
        : "US"
    const aliases = [name, ...(GLOBAL_ALIAS_KEYWORDS[symbol] ?? [])]

    return buildIndexedItem({ symbol, name, exchange }, aliases)
  })
}

const FALLBACK_ALIAS_ITEMS = buildAliasItems()

async function fetchKrxItems() {
  const response = await fetch(KRX_CORP_LIST_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "User-Agent": "Mozilla/5.0",
    },
    next: { revalidate: 60 * 60 * 24 },
    signal: getAbortSignal(),
  })

  if (!response.ok) {
    throw new Error(`KRX 종목 목록 조회 실패: ${response.status}`)
  }

  const html = new TextDecoder("euc-kr").decode(await response.arrayBuffer())
  const items: IndexedSymbolSearchItem[] = []

  for (const match of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const rowHtml = match[1]
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) =>
      stripHtml(cell[1])
    )

    if (cells.length < 3) {
      continue
    }

    const [name, market, code] = cells
    if (!name || !/^\d{6}$/.test(code)) {
      continue
    }

    items.push(
      buildIndexedItem(
        {
          symbol: code,
          name,
          exchange: mapKrxExchange(market),
        },
        [name, code]
      )
    )
  }

  return items
}

async function fetchSecItems() {
  const response = await fetch(SEC_TICKER_LIST_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "stock-journal-test test@example.com",
    },
    next: { revalidate: 60 * 60 * 24 },
    signal: getAbortSignal(),
  })

  if (!response.ok) {
    throw new Error(`SEC 종목 목록 조회 실패: ${response.status}`)
  }

  const payload = (await response.json()) as Record<string, SecTickerEntry>

  return Object.values(payload)
    .filter((item) => item.ticker && item.title)
    .map((item) =>
      buildIndexedItem(
        {
          symbol: item.ticker!.toUpperCase(),
          name: item.title!,
          exchange: "US",
        },
        [item.ticker!, item.title!]
      )
    )
}

async function loadKrxItems() {
  if (!krxItemsPromise) {
    krxItemsPromise = fetchKrxItems().catch((error) => {
      krxItemsPromise = null
      console.error("[symbol-search] KRX load failed", error)
      return []
    })
  }

  return krxItemsPromise
}

async function loadSecItems() {
  if (!secItemsPromise) {
    secItemsPromise = fetchSecItems().catch((error) => {
      secItemsPromise = null
      console.error("[symbol-search] SEC load failed", error)
      return []
    })
  }

  return secItemsPromise
}

export async function searchSymbols(query: string): Promise<SymbolSearchItem[]> {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery.length < 2) {
    return []
  }

  const sources: IndexedSymbolSearchItem[] = [...FALLBACK_ALIAS_ITEMS]

  if (isKoreanQuery(query) || isNumericTickerQuery(normalizedQuery)) {
    sources.push(...(await loadKrxItems()))
  }

  if (!isKoreanQuery(query) || /^[a-z]/i.test(query)) {
    sources.push(...(await loadSecItems()))
  }

  const bestBySymbol = new Map<string, { item: IndexedSymbolSearchItem; score: number }>()

  for (const item of sources) {
    const score = getScore(item, normalizedQuery)
    if (score === 0) {
      continue
    }

    const existing = bestBySymbol.get(item.symbol)
    if (!existing || score > existing.score) {
      bestBySymbol.set(item.symbol, { item, score })
    }
  }

  return [...bestBySymbol.values()]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.item.name.localeCompare(right.item.name, "ko")
    })
    .slice(0, SEARCH_RESULT_LIMIT)
    .map(({ item }) => ({
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
    }))
}
