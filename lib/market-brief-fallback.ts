import type { AuthSession } from "@/lib/auth/shared"
import type { TradingJournal } from "@/lib/supabase"
import type { KoreaMarketSnapshot, UsNewsItem } from "@/lib/market-feed"
import type { DailyAiBrief } from "@/lib/gemini-brief-types"

type FallbackContext = {
  session: AuthSession
  journals: TradingJournal[]
  korea: KoreaMarketSnapshot
  headlines: UsNewsItem[]
  notice?: string
}

function isLikelyDerivative(name: string) {
  return /KODEX|TIGER|ETN|ETF|레버리지|인버스|RISE|SOL |ACE |PLUS |HANARO/i.test(name)
}

function isCommonIdea(name: string, ticker: string) {
  const normalizedName = name.trim().toLowerCase()
  const normalizedTicker = ticker.trim().toUpperCase()
  if (["005930", "000660", "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL"].includes(normalizedTicker)) {
    return true
  }
  return ["삼성전자", "sk하이닉스", "애플", "엔비디아", "테슬라", "마이크로소프트", "아마존"].some((entry) =>
    normalizedName.includes(entry)
  )
}

function buildWatchlist(korea: KoreaMarketSnapshot, openHoldings: TradingJournal[]) {
  const holdingKeys = new Set(
    openHoldings.flatMap((journal) => [
      journal.company_name.trim(),
      journal.ticker.trim().toUpperCase(),
    ])
  )

  const candidates = [...korea.popular.slice(0, 5), ...korea.gainers.slice(0, 5)]
    .filter((item) => !isLikelyDerivative(item.name))
    .filter((item) => !isCommonIdea(item.name, item.code))
    .filter((item, index, array) => array.findIndex((entry) => entry.code === item.code) === index)
    .slice(0, 5)

  return candidates.map((item) => {
    const isHolding =
      holdingKeys.has(item.name) || holdingKeys.has(item.code) || holdingKeys.has(item.code.replace(/^0+/, ""))

    const changeText =
      item.changePercent != null
        ? `${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}%`
        : "변동률 정보 없음"

    return {
      name: item.name,
      ticker: item.code,
      reason: `오늘 검색/시장 흐름 상위이며 단기 수급이 붙는 구간입니다. 현재 ${changeText}입니다.`,
      risk: "거래대금 유지 여부와 전일 고점 돌파 실패 구간을 먼저 확인하세요.",
      relation: isHolding ? "현재 보유 중인 종목입니다." : null,
    }
  })
}

function buildHoldingsNotes(journals: TradingJournal[]) {
  return journals
    .filter((journal) => journal.exit_price == null)
    .slice(0, 6)
    .map((journal) => ({
      name: journal.company_name,
      ticker: journal.ticker || "",
      note: `평균단가 ${journal.entry_price.toLocaleString("ko-KR")}원 기준으로 목표가·손절가를 다시 점검하세요.`,
    }))
}

function inferMarketMood(korea: KoreaMarketSnapshot): DailyAiBrief["marketMood"] {
  const changes = korea.gainers
    .slice(0, 5)
    .map((item) => item.changePercent)
    .filter((value): value is number => value != null)

  if (changes.length === 0) {
    return "mixed"
  }

  const average = changes.reduce((sum, value) => sum + value, 0) / changes.length
  if (average >= 2) return "risk-on"
  if (average <= -1) return "risk-off"
  return "mixed"
}

export function buildFallbackMarketBrief(context: FallbackContext): DailyAiBrief {
  const openHoldings = context.journals.filter((journal) => journal.exit_price == null)
  const topPopular = context.korea.popular[0]
  const topGainer =
    context.korea.gainers.find((item) => !isLikelyDerivative(item.name)) ?? context.korea.gainers[0]
  const topActive =
    context.korea.active.find((item) => !isLikelyDerivative(item.name)) ?? context.korea.active[0]
  const mood = inferMarketMood(context.korea)

  const summaryParts = [
    topPopular ? `검색 1위는 ${topPopular.name}` : null,
    topGainer
      ? `급등 선두는 ${topGainer.name}${
          topGainer.changePercent != null ? ` (${topGainer.changePercent >= 0 ? "+" : ""}${topGainer.changePercent.toFixed(2)}%)` : ""
        }`
      : null,
    topActive ? `거래는 ${topActive.name} 쪽에 집중` : null,
  ].filter(Boolean)

  const principleRate =
    context.journals.length > 0
      ? Math.round(
          (context.journals.filter((journal) => journal.is_principle).length /
            context.journals.length) *
            100
        )
      : 0

  return {
    summary:
      summaryParts.length > 0
        ? `${summaryParts.join(", ")}입니다. Gemini 한도 초과로 시장 데이터 기반 요약을 표시합니다.`
        : "시장 데이터를 기반으로 오늘 브리핑을 생성했습니다.",
    marketMood: mood,
    watchlist: buildWatchlist(context.korea, openHoldings),
    holdingsNotes: buildHoldingsNotes(context.journals),
    caution:
      principleRate < 70
        ? "최근 뇌동매매 비중이 높습니다. 신규 진입 전에 기록된 시나리오를 먼저 확인하세요."
        : "계획된 진입만 검토하고, 급등 종목은 추격보다 눌림/확인 후 판단하세요.",
    generatedAt: new Date().toISOString(),
    source: "fallback",
    notice:
      context.notice ??
      "Gemini API를 사용할 수 없어 시장 데이터 기반 요약으로 대체했습니다.",
  }
}
