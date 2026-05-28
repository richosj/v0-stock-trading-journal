export type CryptoNewsItem = {
  title: string
  url: string
  source: string
  publishedAt: string | null
  koreanSummary: string
}

const CRYPTO_RSS_SOURCES = [
  {
    source: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
  },
  {
    source: "Cointelegraph",
    url: "https://cointelegraph.com/rss",
  },
] as const

const CRYPTO_NEWS_HINTS: Array<{ pattern: RegExp; hint: string }> = [
  { pattern: /bitcoin|btc/i, hint: "비트코인 수급/심리 변화와 연동된 이슈입니다." },
  { pattern: /ethereum|eth/i, hint: "이더리움 생태계 및 메이저 알트 흐름 관련 뉴스입니다." },
  { pattern: /etf|sec|regulation|lawsuit/i, hint: "규제·제도 이슈로 단기 변동성이 커질 수 있습니다." },
  { pattern: /hack|exploit|breach|attack/i, hint: "보안 사고 이슈로 리스크 관리가 필요한 구간입니다." },
  { pattern: /exchange|binance|coinbase/i, hint: "거래소 정책/유동성 변화에 영향을 받는 뉴스입니다." },
  { pattern: /staking|yield|defi|protocol/i, hint: "디파이·스테이킹 수익 구조 변화와 관련된 이슈입니다." },
  { pattern: /layer ?2|rollup|scaling|gas/i, hint: "수수료·확장성 개선 기대가 반영되는 뉴스입니다." },
]

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

function buildKoreanCryptoHint(title: string) {
  const normalized = title.trim()
  if (!normalized) {
    return "코인 시장 전반 심리에 영향을 줄 수 있는 뉴스입니다."
  }
  const matched = CRYPTO_NEWS_HINTS.find((entry) => entry.pattern.test(normalized))
  if (matched) return matched.hint
  return "뉴스 재료의 지속성과 거래량 동반 여부를 함께 확인하세요."
}

function parseRssPubDate(value: string | null) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function parseRssItems(xml: string, source: string) {
  const items: CryptoNewsItem[] = []
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const itemXml = match[1]
    const title = decodeXmlText(itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "")
    const url = decodeXmlText(itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "")
    const publishedAt = decodeXmlText(itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "")
    if (!title || !url) continue
    if (!url.startsWith("http")) continue
    items.push({
      title,
      url: url.replace("http://", "https://"),
      source,
      publishedAt: publishedAt || null,
      koreanSummary: buildKoreanCryptoHint(title),
    })
  }
  return items
}

async function fetchRssFeed(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9",
      "User-Agent": "Mozilla/5.0",
    },
    next: { revalidate: 60 * 10 },
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) {
    return ""
  }
  return await response.text()
}

export async function fetchCryptoNews(limit = 30) {
  const batches = await Promise.all(
    CRYPTO_RSS_SOURCES.map(async ({ source, url }) => {
      try {
        const xml = await fetchRssFeed(url)
        if (!xml) return []
        return parseRssItems(xml, source)
      } catch {
        return []
      }
    })
  )

  const dedup = new Map<string, CryptoNewsItem>()
  for (const item of batches.flat()) {
    if (!dedup.has(item.url)) dedup.set(item.url, item)
  }

  return [...dedup.values()]
    .sort((a, b) => parseRssPubDate(b.publishedAt) - parseRssPubDate(a.publishedAt))
    .slice(0, limit)
}
