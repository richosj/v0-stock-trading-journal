import { COMPANY_SYMBOL_ALIASES } from "@/lib/market-quotes"

export type KoreaMarketCardItem = {
  rank: number
  code: string
  name: string
  price: number | null
  change: number | null
  changePercent: number | null
  detailUrl: string
}

export type KoreaMarketSnapshot = {
  popular: KoreaMarketCardItem[]
  gainers: KoreaMarketCardItem[]
  active: KoreaMarketCardItem[]
  fetchedAt: string
}

export type UsNewsItem = {
  title: string
  author: string | null
  publishedAt: string | null
  url: string
  imageUrl: string | null
  relatedTicker: string | null
  relatedLabel: string | null
}

type UsHolding = {
  ticker: string
  companyName: string
}

const NAVER_BASE_URL = "https://finance.naver.com"
const INVESTING_NEWS_RSS_URL = "https://www.investing.com/rss/news.rss"
const REMOTE_TIMEOUT_MS = 10000
const MARKET_ITEM_LIMIT = 10
const GENERAL_NEWS_LIMIT = 8
const RELATED_NEWS_LIMIT = 6

const US_TICKER_ALIASES: Record<string, string[]> = {
  NVDA: ["nvidia", "엔비디아"],
  AAPL: ["apple", "애플"],
  TSLA: ["tesla", "테슬라"],
  MSFT: ["microsoft", "마이크로소프트"],
  GOOGL: ["google", "alphabet", "구글"],
  META: ["meta", "facebook", "메타", "페이스북"],
  AMZN: ["amazon", "아마존"],
  NFLX: ["netflix", "넷플릭스"],
}

function getAbortSignal() {
  return AbortSignal.timeout(REMOTE_TIMEOUT_MS)
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

function parseNumber(value: string) {
  const normalized = value.replace(/,/g, "").replace(/[^\d.-]/g, "")
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

async function fetchEucKrHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "User-Agent": "Mozilla/5.0",
    },
    next: { revalidate: 60 * 5 },
    signal: getAbortSignal(),
  })

  if (!response.ok) {
    throw new Error(`시장 페이지 조회 실패: ${response.status}`)
  }

  return new TextDecoder("euc-kr").decode(await response.arrayBuffer())
}

function parseNaverTable(html: string) {
  const items: KoreaMarketCardItem[] = []

  for (const match of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const rowHtml = match[1]
    if (!rowHtml.includes('class="tltle"') || !rowHtml.includes('class="no"')) {
      continue
    }

    const codeMatch = rowHtml.match(/\/item\/main\.naver\?code=([^"]+)/)
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) =>
      stripHtml(cell[1])
    )

    if (!codeMatch || cells.length < 5) {
      continue
    }

    const rank = parseNumber(cells[0])
    const name = cells[1]

    if (!rank || !name) {
      continue
    }

    const isPopularSearchTable = cells[2]?.includes("%")
    const priceIndex = isPopularSearchTable ? 3 : 2
    const changeIndex = isPopularSearchTable ? 4 : 3
    const changePercentIndex = isPopularSearchTable ? 5 : 4

    items.push({
      rank,
      code: codeMatch[1],
      name,
      price: parseNumber(cells[priceIndex] ?? ""),
      change: parseNumber(cells[changeIndex] ?? ""),
      changePercent: parseNumber(cells[changePercentIndex] ?? ""),
      detailUrl: `${NAVER_BASE_URL}/item/main.naver?code=${codeMatch[1]}`,
    })
  }

  return items.slice(0, MARKET_ITEM_LIMIT)
}

export async function fetchKoreaMarketSnapshot(): Promise<KoreaMarketSnapshot> {
  const [popularHtml, gainersHtml, activeHtml] = await Promise.all([
    fetchEucKrHtml(`${NAVER_BASE_URL}/sise/lastsearch2.naver`),
    fetchEucKrHtml(`${NAVER_BASE_URL}/sise/sise_rise.naver`),
    fetchEucKrHtml(`${NAVER_BASE_URL}/sise/sise_quant.naver`),
  ])

  return {
    popular: parseNaverTable(popularHtml),
    gainers: parseNaverTable(gainersHtml),
    active: parseNaverTable(activeHtml),
    fetchedAt: new Date().toISOString(),
  }
}

function decodeXmlText(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

function buildHoldingAliases(holding: UsHolding) {
  const ticker = holding.ticker.trim().toUpperCase()
  const rawAlias = COMPANY_SYMBOL_ALIASES[holding.companyName]
  const aliases = new Set<string>([
    ticker,
    holding.companyName.trim().toLowerCase(),
    ...(US_TICKER_ALIASES[ticker] ?? []),
  ])

  if (rawAlias) {
    aliases.add(rawAlias.replace(/\.(KS|KQ)$/i, "").toLowerCase())
  }

  return [...aliases].filter(Boolean)
}

function resolveRelatedHolding(title: string, holdings: UsHolding[]) {
  const normalizedTitle = title.toLowerCase()

  for (const holding of holdings) {
    const aliases = buildHoldingAliases(holding)
    if (aliases.some((alias) => normalizedTitle.includes(alias.toLowerCase()))) {
      return {
        relatedTicker: holding.ticker.toUpperCase(),
        relatedLabel: holding.companyName || holding.ticker.toUpperCase(),
      }
    }
  }

  return {
    relatedTicker: null,
    relatedLabel: null,
  }
}

export async function fetchUsMarketNews(holdings: UsHolding[]) {
  const response = await fetch(INVESTING_NEWS_RSS_URL, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9",
      "User-Agent": "Mozilla/5.0",
    },
    next: { revalidate: 60 * 10 },
    signal: getAbortSignal(),
  })

  if (!response.ok) {
    throw new Error(`미국 뉴스 조회 실패: ${response.status}`)
  }

  const xml = await response.text()
  const items: UsNewsItem[] = []

  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const itemXml = match[1]
    const title = decodeXmlText(itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "")
    const author = decodeXmlText(itemXml.match(/<author>([\s\S]*?)<\/author>/)?.[1] ?? "")
    const publishedAt = decodeXmlText(
      itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ""
    )
    const url = decodeXmlText(itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "")
    const imageUrl = itemXml.match(/<enclosure[^>]*url="([^"]+)"/)?.[1] ?? null

    if (!title || !url) {
      continue
    }

    const related = resolveRelatedHolding(title, holdings)

    items.push({
      title,
      author: author || null,
      publishedAt: publishedAt || null,
      url,
      imageUrl,
      relatedTicker: related.relatedTicker,
      relatedLabel: related.relatedLabel,
    })
  }

  return {
    headlines: items.slice(0, GENERAL_NEWS_LIMIT),
    related: items
      .filter((item) => item.relatedTicker)
      .slice(0, RELATED_NEWS_LIMIT),
    fetchedAt: new Date().toISOString(),
  }
}
