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

export type KoreaStockFundamental = {
  code: string
  prevClose: string | null
  open: string | null
  high: string | null
  low: string | null
  volume: string | null
  value: string | null
  marketCap: string | null
  per: string | null
  pbr: string | null
  eps: string | null
}

export type UsNewsItem = {
  title: string
  koreanSummary: string
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
const INVESTING_RSS_FEEDS = [
  "https://kr.investing.com/rss/news.rss",
  "https://kr.investing.com/rss/news_25.rss",
  "https://kr.investing.com/rss/news_301.rss",
]
const REMOTE_TIMEOUT_MS = 10000
const MARKET_ITEM_LIMIT = 10
const GENERAL_NEWS_LIMIT = 24
const RELATED_NEWS_LIMIT = 12
const RSS_PARSE_LIMIT = 80

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

const NEWS_KEYWORD_HINTS: Array<{ pattern: RegExp; hint: string }> = [
  { pattern: /\bfed\b|interest rate|inflation|cpi|pce/i, hint: "금리/물가 변수에 민감한 장세입니다." },
  { pattern: /earnings|guidance|forecast|revenue|profit/i, hint: "실적 발표/가이던스 이슈가 핵심입니다." },
  { pattern: /chip|semiconductor|ai|nvidia/i, hint: "AI/반도체 수급 흐름과 연동된 뉴스입니다." },
  { pattern: /oil|crude|opec|energy|gas/i, hint: "원자재·에너지 가격 변동성이 반영된 이슈입니다." },
  { pattern: /tariff|export|trade|china|geopolitical/i, hint: "무역/지정학 변수에 영향을 받는 뉴스입니다." },
  { pattern: /tesla|ev|electric vehicle|battery/i, hint: "전기차/배터리 섹터 심리에 영향이 있습니다." },
  { pattern: /downgrade|upgrade|target price|analyst/i, hint: "애널리스트 의견·목표가 조정 이슈입니다." },
  { pattern: /merger|acquisition|deal|takeover/i, hint: "인수합병/계약 모멘텀 관련 소식입니다." },
]

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

  const buffer = await response.arrayBuffer()
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase()
  const utf8 = new TextDecoder("utf-8").decode(buffer)

  if (contentType.includes("utf-8")) {
    return utf8
  }

  const eucKr = new TextDecoder("euc-kr").decode(buffer)
  if (contentType.includes("euc-kr")) {
    return eucKr
  }

  const score = (text: string) => {
    const hangul = (text.match(/[가-힣]/g) ?? []).length
    const broken = (text.match(/�/g) ?? []).length
    return hangul - broken * 3
  }

  return score(utf8) >= score(eucKr) ? utf8 : eucKr
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
  try {
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
  } catch {
    return {
      popular: [],
      gainers: [],
      active: [],
      fetchedAt: new Date().toISOString(),
    }
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

function normalizeCellLabel(label: string) {
  return label
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .trim()
}

function buildCellMap(html: string) {
  const fieldMap = new Map<string, string>()

  for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = row[1]
    const headers = [...rowHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) =>
      normalizeCellLabel(stripHtml(m[1]))
    )
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      stripHtml(m[1]).replace(/\s+/g, " ").trim()
    )

    const pairCount = Math.min(headers.length, cells.length)
    for (let i = 0; i < pairCount; i += 1) {
      const header = headers[i]
      const value = cells[i]
      if (!header || !value) continue
      if (!fieldMap.has(header)) {
        fieldMap.set(header, value)
      }
    }
  }

  return fieldMap
}

function extractCellValue(cellMap: Map<string, string>, labels: string[]) {
  for (const label of labels) {
    const normalized = normalizeCellLabel(label)
    if (!normalized) continue

    for (const [key, value] of cellMap.entries()) {
      if (!key) continue
      if (key === normalized || key.includes(normalized) || normalized.includes(key)) {
        return value
      }
    }
  }
  return null
}

async function fetchKoreaStockFundamental(code: string): Promise<KoreaStockFundamental | null> {
  if (!/^\d{5,6}$/.test(code)) return null
  const html = await fetchEucKrHtml(`${NAVER_BASE_URL}/item/main.naver?code=${code}`)
  const cellMap = buildCellMap(html)
  return {
    code,
    prevClose: extractCellValue(cellMap, ["전일", "전일가"]),
    open: extractCellValue(cellMap, ["시가", "시작"]),
    high: extractCellValue(cellMap, ["고가"]),
    low: extractCellValue(cellMap, ["저가"]),
    volume: extractCellValue(cellMap, ["거래량"]),
    value: extractCellValue(cellMap, ["거래대금", "대금"]),
    marketCap: extractCellValue(cellMap, ["시가총액", "시총"]),
    per: extractCellValue(cellMap, ["PER"]),
    pbr: extractCellValue(cellMap, ["PBR"]),
    eps: extractCellValue(cellMap, ["EPS"]),
  }
}

async function fetchKoreaStockMarketCapFallback(code: string): Promise<string | null> {
  if (!/^\d{5,6}$/.test(code)) return null

  try {
    const html = await fetchEucKrHtml(`${NAVER_BASE_URL}/item/sise.naver?code=${code}`)
    const rowMatch = html.match(
      /<th[^>]*class="title"[^>]*>\s*시가총액\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i
    )
    if (!rowMatch?.[1]) return null

    const value = stripHtml(rowMatch[1]).replace(/\s+/g, " ").trim()
    return value || null
  } catch {
    return null
  }
}

function buildKoreanNewsHint(title: string) {
  const normalized = title.trim()
  if (!normalized) {
    return "미국 시장 주요 이슈 기사입니다."
  }

  const matched = NEWS_KEYWORD_HINTS.find((entry) => entry.pattern.test(normalized))
  if (matched) {
    return matched.hint
  }

  return "기사 제목 기준으로 단기 수급/심리 변화를 확인할 필요가 있습니다."
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

function extractRssImage(itemXml: string): string | null {
  const candidates = [
    itemXml.match(/<enclosure[^>]*url="([^"]+)"/)?.[1],
    itemXml.match(/<media:content[^>]*url="([^"]+)"/)?.[1],
    itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"/)?.[1],
    itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.match(/<img[^>]+src="([^"]+)"/)?.[1],
    itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/)?.[1]?.match(/<img[^>]+src="([^"]+)"/)?.[1],
  ]

  for (const raw of candidates) {
    if (!raw) continue
    const url = decodeXmlText(raw)
    if (url.startsWith("http") && !/\.(svg|ico)(\?|$)/i.test(url)) {
      return url
    }
  }

  return null
}

function parseRssPubDate(value: string) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function parseRssItems(xml: string, holdings: UsHolding[]) {
  const items: UsNewsItem[] = []

  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const itemXml = match[1]
    const title = decodeXmlText(itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "")
    const author = decodeXmlText(itemXml.match(/<author>([\s\S]*?)<\/author>/)?.[1] ?? "")
    const publishedAt = decodeXmlText(
      itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ""
    )
    const url = decodeXmlText(itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "")
    const imageUrl = extractRssImage(itemXml)

    if (!title || !url) {
      continue
    }

    const related = resolveRelatedHolding(title, holdings)

    const normalizedUrl = url.replace("http://", "https://")
    if (!normalizedUrl.includes("kr.investing.com")) {
      continue
    }

    items.push({
      title,
      koreanSummary: buildKoreanNewsHint(title),
      author: author || null,
      publishedAt: publishedAt || null,
      url: normalizedUrl,
      imageUrl,
      relatedTicker: related.relatedTicker,
      relatedLabel: related.relatedLabel,
    })
  }

  return items
}

function mergeNewsItems(batches: UsNewsItem[]) {
  const byUrl = new Map<string, UsNewsItem>()

  for (const item of batches) {
    const existing = byUrl.get(item.url)
    if (!existing) {
      byUrl.set(item.url, item)
      continue
    }
    if (!existing.imageUrl && item.imageUrl) {
      byUrl.set(item.url, { ...existing, imageUrl: item.imageUrl })
    }
  }

  return [...byUrl.values()].sort(
    (a, b) => parseRssPubDate(b.publishedAt ?? "") - parseRssPubDate(a.publishedAt ?? "")
  )
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

async function fetchInvestingRssFeed(feedUrl: string) {
  const response = await fetch(feedUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9",
      "User-Agent": "Mozilla/5.0",
    },
    next: { revalidate: 60 * 10 },
    signal: getAbortSignal(),
  })

  if (!response.ok) {
    return ""
  }

  const buffer = await response.arrayBuffer()
  return decodeInvestingRss(buffer)
}

function decodeInvestingRss(buffer: ArrayBuffer) {
  const utf8 = new TextDecoder("utf-8").decode(buffer)
  const hasBrokenUnicode = utf8.includes("���")

  if (!hasBrokenUnicode) {
    return utf8
  }

  try {
    const eucKr = new TextDecoder("euc-kr").decode(buffer)
    const eucKrHangulScore = (eucKr.match(/[가-힣]/g) ?? []).length
    const utf8HangulScore = (utf8.match(/[가-힣]/g) ?? []).length
    return eucKrHangulScore >= utf8HangulScore ? eucKr : utf8
  } catch {
    return utf8
  }
}

export async function fetchUsMarketNews(holdings: UsHolding[]) {
  try {
    const xmlBodies = await Promise.all(INVESTING_RSS_FEEDS.map((url) => fetchInvestingRssFeed(url)))
    const parsed = xmlBodies.flatMap((xml) => (xml ? parseRssItems(xml, holdings) : []))

    if (parsed.length === 0) {
      return {
        headlines: [],
        related: [],
        fetchedAt: new Date().toISOString(),
      }
    }

    const items = mergeNewsItems(parsed).slice(0, RSS_PARSE_LIMIT)

    const withImages = items.filter((item) => item.imageUrl)
    const headlinesPool = withImages.length >= 6 ? withImages : items

    return {
      headlines: headlinesPool.slice(0, GENERAL_NEWS_LIMIT),
      related: items
        .filter((item) => item.relatedTicker)
        .slice(0, RELATED_NEWS_LIMIT),
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    return {
      headlines: [],
      related: [],
      fetchedAt: new Date().toISOString(),
    }
  }
}

export async function fetchKoreaStockFundamentals(codes: string[]) {
  const unique = [...new Set(codes.filter((code) => /^\d{5,6}$/.test(code)))]
  const rows = await Promise.all(
    unique.map(async (code) => {
      try {
        return await fetchKoreaStockFundamental(code)
      } catch {
        return null
      }
    })
  )
  const withFallback = await Promise.all(
    rows.map(async (row) => {
      if (!row) return null
      if (row.marketCap) return row

      const fallbackMarketCap = await fetchKoreaStockMarketCapFallback(row.code)
      if (!fallbackMarketCap) return row
      return { ...row, marketCap: fallbackMarketCap }
    })
  )
  return withFallback.filter((row): row is KoreaStockFundamental => Boolean(row))
}

export function getNaverStockLogoUrl(code: string) {
  return `https://ssl.pstatic.net/imgstock/fn/real/logo/naver/${code}.png`
}

export function formatMarketTimestamp(value: string | null) {
  if (!value) {
    return "방금 전"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
