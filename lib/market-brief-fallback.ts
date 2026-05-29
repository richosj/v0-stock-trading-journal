import type { AuthSession } from "@/lib/auth/shared"
import type { TradingJournal } from "@/lib/supabase"
import type { KoreaMarketSnapshot, UsNewsItem } from "@/lib/market-feed"
import type { DailyAiBrief } from "@/lib/gemini-brief-types"
import { buildHoldingsNotesFromJournals } from "@/lib/holdings-notes"
import { ensureWatchlistMinimum } from "@/lib/brief-watchlist-utils"

type FallbackContext = {
  session: AuthSession
  journals: TradingJournal[]
  korea: KoreaMarketSnapshot
  headlines: UsNewsItem[]
  holdingQuotes?: Array<{
    journalId: string
    regularMarketPrice: number | null
    changePercent: number | null
  }>
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

  const sourceRank = new Map<string, { popular?: number; gainers?: number; active?: number }>()
  korea.popular.slice(0, 8).forEach((item) => {
    sourceRank.set(item.code, { ...(sourceRank.get(item.code) ?? {}), popular: item.rank })
  })
  korea.gainers.slice(0, 8).forEach((item) => {
    sourceRank.set(item.code, { ...(sourceRank.get(item.code) ?? {}), gainers: item.rank })
  })
  korea.active.slice(0, 8).forEach((item) => {
    sourceRank.set(item.code, { ...(sourceRank.get(item.code) ?? {}), active: item.rank })
  })

  const merged = [...korea.popular.slice(0, 8), ...korea.gainers.slice(0, 8), ...korea.active.slice(0, 8)]
    .filter((item, index, array) => array.findIndex((entry) => entry.code === item.code) === index)

  let candidates = merged
    .filter((item) => !isLikelyDerivative(item.name))
    .filter((item) => !isCommonIdea(item.name, item.code))
    .slice(0, 8)

  if (candidates.length === 0) {
    candidates = merged.filter((item) => !isLikelyDerivative(item.name)).slice(0, 8)
  }
  if (candidates.length === 0) {
    candidates = merged.slice(0, 8)
  }

  const themeMap: Array<{ pattern: RegExp; theme: string; catalyst: string }> = [
    { pattern: /반도체|칩|hbm|메모리/i, theme: "AI 반도체", catalyst: "반도체/AI 수요 모멘텀" },
    { pattern: /전력|원전|변압기|전선/i, theme: "전력/원전", catalyst: "인프라 투자/정책 모멘텀" },
    { pattern: /바이오|제약|헬스케어|진단/i, theme: "바이오/제약", catalyst: "임상/허가 이슈" },
    { pattern: /배터리|2차전지|전기차/i, theme: "2차전지/EV", catalyst: "수요/원재료 흐름" },
    { pattern: /방산|항공|우주/i, theme: "방산/우주항공", catalyst: "수주/정책 모멘텀" },
  ]

  const ranked = candidates.map((item) => {
    const isHolding =
      holdingKeys.has(item.name) || holdingKeys.has(item.code) || holdingKeys.has(item.code.replace(/^0+/, ""))

    const changeText =
      item.changePercent != null
        ? `${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}%`
        : "변동률 정보 없음"
    const themeHit = themeMap.find((rule) => rule.pattern.test(item.name))
    const themeText = themeHit?.theme ?? "단기 수급형"
    const catalyst = themeHit?.catalyst ?? "거래대금/수급 집중"
    const source = sourceRank.get(item.code)
    const sourceText = [
      source?.popular ? `검색 ${source.popular}위` : null,
      source?.gainers ? `상승 ${source.gainers}위` : null,
      source?.active ? `거래 ${source.active}위` : null,
    ]
      .filter(Boolean)
      .join(" · ")
    const volatilityRisk =
      item.changePercent == null
        ? "장중 변동률 재확인 필요"
        : Math.abs(item.changePercent) >= 8
          ? "과열 구간 가능성 높음"
          : Math.abs(item.changePercent) >= 4
            ? "변동성 확대 구간"
            : "완만한 변동"
    const directionRisk =
      item.changePercent != null && item.changePercent < 0
        ? "하락 추세 지속 시 손절 라인 이탈 주의"
        : "전일 고점 돌파 실패 시 되돌림 주의"

    const score = scoreFallbackCandidate(item, source, holdingKeys)

    return {
      name: item.name,
      ticker: item.code,
      reason: `테마: ${themeText} | 대장 근거: ${sourceText || "시장 상위"} + ${catalyst}. 현재 ${changeText}이며 뉴스/수급 동시 확인 구간입니다. (랭킹 점수 ${score.toFixed(1)})`,
      risk: `${volatilityRisk}. ${directionRisk}. 거래대금 유지 여부를 반드시 체크하세요.`,
      relation: isHolding ? "현재 보유 중인 종목입니다." : null,
      _score: score,
    }
  })

  return ranked
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)
    .map(({ _score, ...item }) => item)
}

function scoreFallbackCandidate(
  item: KoreaMarketSnapshot["popular"][number],
  source: { popular?: number; gainers?: number; active?: number } | undefined,
  holdingKeys: Set<string>
) {
  let score = 0
  if (source?.active) score += Math.max(0, 32 - (source.active - 1) * 3)
  if (source?.gainers) score += Math.max(0, 16 - (source.gainers - 1) * 2)
  if (source?.popular) score += Math.max(0, 12 - (source.popular - 1))

  if (item.changePercent != null) {
    const abs = Math.abs(item.changePercent)
    if (item.changePercent > 0) score += Math.min(16, item.changePercent * 1.8)
    if (abs >= 3 && abs <= 9) score += 6
    if (abs > 12) score -= 5
  }

  if (holdingKeys.has(item.name) || holdingKeys.has(item.code)) score += 4
  return score
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
    watchlist: ensureWatchlistMinimum(buildWatchlist(context.korea, openHoldings), context.korea),
    holdingsNotes: buildHoldingsNotesFromJournals(context.journals),
    holdingsCoach: buildHoldingsCoach(openHoldings, context.holdingQuotes ?? []),
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

function buildHoldingsCoach(
  openHoldings: TradingJournal[],
  holdingQuotes: Array<{
    journalId: string
    regularMarketPrice: number | null
    changePercent: number | null
  }>
): DailyAiBrief["holdingsCoach"] {
  const quoteMap = new Map(holdingQuotes.map((q) => [q.journalId, q]))

  return openHoldings.slice(0, 6).map((journal) => {
    const quote = quoteMap.get(journal.id)
    const current = quote?.regularMarketPrice ?? null
    const pnlPct =
      current && journal.entry_price > 0
        ? ((current - journal.entry_price) / journal.entry_price) * 100
        : null
    const stance: DailyAiBrief["holdingsCoach"][number]["stance"] =
      pnlPct == null
        ? "wait"
        : pnlPct <= -7
          ? "reduce"
          : pnlPct >= 10
            ? "hold"
            : "wait"

    const confidence =
      pnlPct == null ? 45 : Math.max(40, Math.min(82, 55 + Math.round((pnlPct ?? 0) * 1.2)))

    const target = Math.round(journal.entry_price * 1.08)
    const stop = journal.stop_loss > 0 ? journal.stop_loss : Math.round(journal.entry_price * 0.95)
    const qty = Math.max(1, journal.quantity || 1)
    const expectedProfit = Math.round(Math.max(0, (target - journal.entry_price) * qty))
    const stopLoss = Math.round(Math.max(0, (journal.entry_price - stop) * qty))

    return {
      name: journal.company_name,
      ticker: journal.ticker,
      stance,
      confidence,
      thesis:
        pnlPct == null
          ? "실시간 시세 확인 전까지는 신규 액션을 보류하고 시나리오를 점검하세요."
          : pnlPct >= 0
            ? `현재 평균단가 대비 +${pnlPct.toFixed(2)}% 구간입니다. 수익 구간에서는 목표가 분할 익절 계획을 우선합니다.`
            : `현재 평균단가 대비 ${pnlPct.toFixed(2)}% 구간입니다. 손실 확대 전에 손절/축소 기준을 명확히 하세요.`,
      expectedRange: `${Math.round(journal.entry_price * 0.97).toLocaleString("ko-KR")} ~ ${target.toLocaleString("ko-KR")}원`,
      expectedProfitAmount: `약 +${expectedProfit.toLocaleString("ko-KR")}원`,
      stopGuide: `${stop.toLocaleString("ko-KR")}원 이탈 시 비중 축소/정리 검토`,
      stopLossAmount: `약 -${stopLoss.toLocaleString("ko-KR")}원`,
      riskTrigger:
        (quote?.changePercent ?? 0) <= -3
          ? "당일 급락 지속 + 손절 이탈"
          : "거래대금 감소 + 전일 저점 이탈",
    }
  })
}
