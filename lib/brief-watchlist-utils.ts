import type { KoreaMarketSnapshot } from "@/lib/market-feed"
import type { DailyAiBrief } from "@/lib/gemini-brief-types"

export const EMPTY_KOREA_SNAPSHOT: KoreaMarketSnapshot = {
  popular: [],
  gainers: [],
  active: [],
  fetchedAt: new Date().toISOString(),
}

function dedupeKoreaItems(korea: KoreaMarketSnapshot) {
  const merged = [...korea.active, ...korea.gainers, ...korea.popular]
  return merged.filter(
    (item, index, array) => array.findIndex((entry) => entry.code === item.code) === index
  )
}

export function buildEmergencyWatchlistFromKorea(
  korea: KoreaMarketSnapshot
): DailyAiBrief["watchlist"] {
  const items = dedupeKoreaItems(korea).slice(0, 8)
  if (items.length === 0) return []

  return items.slice(0, 5).map((item) => {
    const changeText =
      item.changePercent != null
        ? `${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}%`
        : "변동률 확인 필요"
    return {
      name: item.name,
      ticker: item.code,
      reason: `테마: 시장 수급형 | 대장 근거: 오늘 시장 상위 종목(${changeText}). 거래대금·추세를 함께 확인하세요.`,
      risk: "급등 추격보다 지지 구간 확인 후 접근하고, 손절 기준을 먼저 정하세요.",
      relation: null,
    }
  })
}

export function ensureWatchlistMinimum(
  watchlist: DailyAiBrief["watchlist"],
  korea: KoreaMarketSnapshot,
  min = 3
): DailyAiBrief["watchlist"] {
  if (watchlist.length >= min) return watchlist.slice(0, 5)

  const merged = [...watchlist]
  for (const candidate of buildEmergencyWatchlistFromKorea(korea)) {
    if (merged.some((item) => item.ticker === candidate.ticker || item.name === candidate.name)) {
      continue
    }
    merged.push(candidate)
    if (merged.length >= 5) break
  }

  return merged
}

export function koreaSnapshotHasData(korea: KoreaMarketSnapshot) {
  return korea.popular.length + korea.gainers.length + korea.active.length > 0
}
