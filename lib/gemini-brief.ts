import "server-only"

import type { AuthSession } from "@/lib/auth/shared"
import type { TradingJournal } from "@/lib/supabase"
import type { KoreaMarketSnapshot, UsNewsItem } from "@/lib/market-feed"
import type { DailyAiBrief } from "@/lib/gemini-brief-types"
import { buildHoldingsNotesFromJournals } from "@/lib/holdings-notes"
import { ensureWatchlistMinimum } from "@/lib/brief-watchlist-utils"

export type { DailyAiBrief } from "@/lib/gemini-brief-types"

type BriefContext = {
  session: AuthSession
  journals: TradingJournal[]
  korea: KoreaMarketSnapshot
  headlines: UsNewsItem[]
  relatedNews: UsNewsItem[]
  holdingQuotes?: Array<{
    journalId: string
    ticker: string
    regularMarketPrice: number | null
    changePercent: number | null
    currency: string | null
  }>
}

type ThemeSignal = {
  theme: string
  catalyst: string
  likelyLeader: string
  market: "KR" | "US" | "MIXED"
}

type KoreaSignal = {
  popularRank?: number
  gainersRank?: number
  activeRank?: number
  changePercent?: number | null
}

type RankedWatchItem = DailyAiBrief["watchlist"][number] & { __score: number }

const COMMON_TICKERS = new Set([
  "005930",
  "000660",
  "035420",
  "207940",
  "373220",
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "AMZN",
  "META",
  "GOOGL",
  "NFLX",
])

const COMMON_NAMES = [
  "삼성전자",
  "sk하이닉스",
  "네이버",
  "lg에너지솔루션",
  "애플",
  "엔비디아",
  "테슬라",
  "마이크로소프트",
  "아마존",
  "메타",
  "알파벳",
]

function isCommonIdea(name: string, ticker: string) {
  const normalizedName = name.trim().toLowerCase()
  const normalizedTicker = ticker.trim().toUpperCase()
  if (COMMON_TICKERS.has(normalizedTicker)) {
    return true
  }
  return COMMON_NAMES.some((entry) => normalizedName.includes(entry))
}

function isDerivativeIdea(name: string) {
  return /KODEX|TIGER|ETN|ETF|레버리지|인버스|RISE|SOL |ACE |PLUS |HANARO/i.test(name)
}

function buildFallbackIdeas(context: BriefContext) {
  const merged = [...context.korea.gainers.slice(0, 10), ...context.korea.active.slice(0, 10)]
  const deduped = merged.filter(
    (item, index, array) => array.findIndex((entry) => entry.code === item.code) === index
  )

  const filtered = deduped
    .filter((item) => !isDerivativeIdea(item.name))
    .filter((item) => !isCommonIdea(item.name, item.code))

  const pool = filtered.length > 0 ? filtered : deduped.filter((item) => !isDerivativeIdea(item.name))

  return pool.slice(0, 5).map((item) => ({
      name: item.name,
      ticker: item.code,
      reason: `오늘 거래/상승 상위에 있으며 단기 수급이 붙는 구간입니다. ${item.changePercent != null ? `현재 ${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}% 흐름입니다.` : "변동률은 장중 재확인이 필요합니다."}`,
      risk: "뉴스 추격 매수보다 거래대금 유지와 지지 구간 재확인 후 접근하세요.",
      relation: null,
    }))
}

const DEFAULT_MODEL = "gemini-2.0-flash"
const BRIEF_CACHE_MS = 60 * 60 * 1000
const BRIEF_PROMPT_VERSION = "v4-holdings-money"

const briefCache = new Map<string, { expiresAt: number; brief: DailyAiBrief }>()

function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.")
  }
  return key
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
}

function buildCacheKey(session: AuthSession) {
  const hourBucket = new Date().toISOString().slice(0, 13)
  return `${session.role}:${session.ownerKey ?? "all"}:journal-notes:${BRIEF_PROMPT_VERSION}:${hourBucket}`
}

function summarizeJournals(journals: TradingJournal[]) {
  const open = journals.filter((journal) => journal.exit_price == null)
  const closed = journals
    .filter((journal) => journal.exit_price != null)
    .slice(0, 5)

  return {
    open: open.map((journal) => ({
      company: journal.company_name,
      ticker: journal.ticker || null,
      entry: journal.entry_price,
      target: journal.target_price || null,
      stop: journal.stop_loss || null,
      tags: journal.strategy ?? [],
      reason: journal.reason?.trim() || null,
      scenarioNotes: journal.scenario_notes?.trim() || null,
      principleNotes: journal.principle_notes?.trim() || null,
      isPrinciple: journal.is_principle,
    })),
    recentClosed: closed.map((journal) => ({
      company: journal.company_name,
      ticker: journal.ticker || null,
      pnl: journal.pnl,
      pnlPercent: journal.pnl_percent,
      isPrinciple: journal.is_principle,
    })),
    principleRate:
      journals.length > 0
        ? Math.round(
            (journals.filter((journal) => journal.is_principle).length / journals.length) * 100
          )
        : 0,
  }
}

const THEME_RULES: Array<{
  theme: string
  market: "KR" | "US" | "MIXED"
  keywords: RegExp
  catalyst: string
}> = [
  {
    theme: "AI 반도체",
    market: "MIXED",
    keywords: /ai|chip|semiconductor|hbm|gpu|nvidia|엔비디아|반도체/i,
    catalyst: "AI 인프라/반도체 수요 모멘텀",
  },
  {
    theme: "전력/원전/전력기기",
    market: "KR",
    keywords: /전력|원전|변압기|그리드|전선|발전/i,
    catalyst: "전력 인프라 투자 확대 기대",
  },
  {
    theme: "바이오/제약",
    market: "KR",
    keywords: /바이오|제약|임상|신약|FDA/i,
    catalyst: "임상/허가/기술수출 이벤트",
  },
  {
    theme: "2차전지/전기차",
    market: "MIXED",
    keywords: /battery|ev|electric vehicle|테슬라|2차전지|배터리|전기차/i,
    catalyst: "전기차 수요·공급망·원재료 이슈",
  },
  {
    theme: "방산/우주항공",
    market: "KR",
    keywords: /방산|국방|미사일|우주|항공/i,
    catalyst: "수주/정책/지정학 모멘텀",
  },
  {
    theme: "클라우드/빅테크 소프트웨어",
    market: "US",
    keywords: /microsoft|amazon|meta|google|cloud|saas|software|데이터센터/i,
    catalyst: "실적 가이던스·클라우드 성장 모멘텀",
  },
]

function inferThemeSignals(context: BriefContext): ThemeSignal[] {
  const pool = [
    ...context.korea.popular,
    ...context.korea.gainers,
    ...context.korea.active,
  ]
  const uniqueKr = pool.filter(
    (item, idx, arr) => arr.findIndex((x) => x.code === item.code) === idx
  )
  const newsText = [
    ...context.headlines.map((item) => item.title),
    ...context.relatedNews.map((item) => item.title),
  ].join(" ")

  const signals: ThemeSignal[] = []
  for (const rule of THEME_RULES) {
    const krLeader = uniqueKr.find((item) => rule.keywords.test(item.name))
    const newsHit = rule.keywords.test(newsText)
    if (!krLeader && !newsHit) continue

    signals.push({
      theme: rule.theme,
      catalyst: rule.catalyst,
      likelyLeader: krLeader
        ? `${krLeader.name}(${krLeader.code})`
        : context.relatedNews.find((item) => item.relatedTicker)?.relatedLabel ??
          context.relatedNews.find((item) => item.relatedTicker)?.relatedTicker ??
          "뉴스 연관주 재확인 필요",
      market: rule.market,
    })
  }

  return signals.slice(0, 6)
}

function buildKoreaSignalLookup(context: BriefContext) {
  const map = new Map<string, KoreaSignal>()
  context.korea.popular.slice(0, 10).forEach((item) => {
    map.set(item.code, { ...(map.get(item.code) ?? {}), popularRank: item.rank, changePercent: item.changePercent })
  })
  context.korea.gainers.slice(0, 10).forEach((item) => {
    map.set(item.code, { ...(map.get(item.code) ?? {}), gainersRank: item.rank, changePercent: item.changePercent })
  })
  context.korea.active.slice(0, 10).forEach((item) => {
    map.set(item.code, { ...(map.get(item.code) ?? {}), activeRank: item.rank, changePercent: item.changePercent })
  })
  return map
}

function buildPrompt(context: BriefContext) {
  const journalSummary = summarizeJournals(context.journals)
  const themeSignals = inferThemeSignals(context)

  return `당신은 개인 매매일지 앱의 복기 코치입니다. 투자 권유가 아니라 "오늘 무엇을 볼지" 브리핑을 작성합니다.

규칙:
- 한국어로 작성
- 매수/매도 추천, 수익 보장, 단정적 예측 금지
- watchlist는 3~5개, 시장 데이터와 뉴스, 사용자 보유 종목을 근거로 작성
- watchlist는 "테마 중심"으로 작성하고 각 종목이 해당 테마의 대장/선도 근거를 포함
- reason 첫 문장은 반드시 "테마: ... | 대장 근거: ..." 형식으로 시작
- 급등률만 보고 뽑지 말고, 뉴스 촉매 + 거래/수급 + 대장주 여부를 함께 판단
- 가능하면 KR 2개 이상 + US 1개 이상 포함(데이터 부족 시 예외)
- ETF/ETN/레버리지 상품은 watchlist에서 제외하고 일반 주식 위주
- 누구나 아는 초대형 대표주(예: 삼성전자/엔비디아/애플/테슬라 등) 반복 추천 지양
- "왜 지금 보는지(촉매/수급)"와 "무엇을 확인해야 하는지(리스크)"를 구체적으로 작성
- holdingsNotes는 빈 배열 [] 로 두세요 (보유 메모는 앱이 일지 원문으로 채움)
- holdingsCoach는 보유 종목별로 반드시 작성:
  - stance: hold/reduce/exit/wait
  - confidence: 0~100 정수
  - thesis: 현재 들고가도 되는지 핵심 판단 (2~3문장)
  - expectedRange: 향후 1~4주 관찰 가격 범위 (문자열, 예: "68,000~74,000원")
  - stopGuide: 손절/축소 기준 가격 포함
  - riskTrigger: 어떤 조건이면 계획 무효화되는지
- JSON만 출력

사용자: ${context.session.label}
원칙매매 비율: ${journalSummary.principleRate}%

보유/진행 중 종목:
${JSON.stringify(journalSummary.open, null, 2)}

최근 종료 거래:
${JSON.stringify(journalSummary.recentClosed, null, 2)}

한국 시장 인기 검색:
${JSON.stringify(context.korea.popular.slice(0, 8), null, 2)}

한국 시장 급등:
${JSON.stringify(context.korea.gainers.slice(0, 8), null, 2)}

한국 시장 거래상위:
${JSON.stringify(context.korea.active.slice(0, 8), null, 2)}

미국 뉴스 헤드라인:
${JSON.stringify(
  context.headlines.slice(0, 6).map((item) => ({ title: item.title, author: item.author })),
  null,
  2
)}

보유 종목 연관 뉴스:
${JSON.stringify(
  context.relatedNews.slice(0, 4).map((item) => ({
    title: item.title,
    ticker: item.relatedTicker,
  })),
  null,
  2
)}

보유 종목 실시간 참고 시세:
${JSON.stringify(context.holdingQuotes ?? [], null, 2)}

테마 후보(뉴스/시장 기반):
${JSON.stringify(themeSignals, null, 2)}

다음 JSON 스키마를 따르세요:
{
  "summary": "오늘 시장 한 줄 요약",
  "marketMood": "risk-on | risk-off | mixed",
  "watchlist": [
    {
      "name": "종목명",
      "ticker": "티커 또는 종목코드",
      "reason": "테마와 대장 근거 + 왜 지금 주목할지",
      "risk": "주의할 점",
      "relation": "내 보유/최근 매매와의 연관 또는 null"
    }
  ],
  "holdingsNotes": [
    {
      "name": "종목명",
      "ticker": "티커",
      "note": "보유 종목 관점 메모"
    }
  ],
  "holdingsCoach": [
    {
      "name": "종목명",
      "ticker": "티커",
      "stance": "hold | reduce | exit | wait",
      "confidence": 0,
      "thesis": "보유 판단 근거",
      "expectedRange": "예상 가격 범위",
      "expectedProfitAmount": "예상 수익금(원)",
      "stopGuide": "손절/축소 기준",
      "stopLossAmount": "손절 예상금액(원)",
      "riskTrigger": "플랜 무효 조건"
    }
  ],
  "caution": "오늘 매매 시 한 줄 주의사항"
}`
}

function normalizeBrief(raw: unknown, context: BriefContext): DailyAiBrief {
  const payload = raw as Partial<DailyAiBrief>
  const marketMood =
    payload.marketMood === "risk-on" ||
    payload.marketMood === "risk-off" ||
    payload.marketMood === "mixed"
      ? payload.marketMood
      : "mixed"

  return {
    summary: payload.summary?.trim() || "오늘 시장 브리핑을 생성했습니다.",
    marketMood,
    watchlist: (() => {
      const aiList = Array.isArray(payload.watchlist)
        ? payload.watchlist
            .filter((item) => item?.name)
            .slice(0, 7)
            .map((item) => ({
              name: String(item.name),
              ticker: String(item.ticker ?? ""),
              reason: normalizeReason(String(item.reason ?? "")),
              risk: normalizeRisk(String(item.risk ?? "")),
              relation: item.relation ? String(item.relation) : null,
            }))
            .filter((item) => !isDerivativeIdea(item.name))
            .filter((item) => !isCommonIdea(item.name, item.ticker))
        : []

      const filled = [...aiList]
      if (filled.length < 3) {
        for (const candidate of buildFallbackIdeas(context)) {
          if (filled.find((item) => item.ticker === candidate.ticker || item.name === candidate.name)) {
            continue
          }
          filled.push(candidate)
          if (filled.length >= 5) {
            break
          }
        }
      }

      const enriched = enrichWatchlist(filled.slice(0, 5), context)
      return ensureWatchlistMinimum(enriched, context.korea)
    })(),
    holdingsNotes: buildHoldingsNotesFromJournals(context.journals),
    holdingsCoach: normalizeHoldingsCoach(payload.holdingsCoach, context),
    caution: payload.caution?.trim() || "충동 매매 없이 계획된 진입만 검토하세요.",
    generatedAt: new Date().toISOString(),
  }
}

function normalizeHoldingsCoach(raw: unknown, context: BriefContext): DailyAiBrief["holdingsCoach"] {
  const open = context.journals.filter((journal) => journal.exit_price == null).slice(0, 6)
  const quoteMap = new Map((context.holdingQuotes ?? []).map((q) => [q.journalId, q]))
  const list = Array.isArray(raw) ? raw : []

  const parsed = list
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Record<string, unknown>)
    .map((item): DailyAiBrief["holdingsCoach"][number] => ({
      name: String(item.name ?? ""),
      ticker: String(item.ticker ?? ""),
      stance: normalizeStance(item.stance),
      confidence: Number.isFinite(Number(item.confidence)) ? Math.max(0, Math.min(100, Number(item.confidence))) : 50,
      thesis: String(item.thesis ?? ""),
      expectedRange: String(item.expectedRange ?? ""),
      expectedProfitAmount: String(item.expectedProfitAmount ?? ""),
      stopGuide: String(item.stopGuide ?? ""),
      stopLossAmount: String(item.stopLossAmount ?? ""),
      riskTrigger: String(item.riskTrigger ?? ""),
    }))
    .filter((item) => item.name)

  if (parsed.length > 0) return parsed.slice(0, 6)

  return open.map((journal) => {
    const quote = quoteMap.get(journal.id)
    const current = quote?.regularMarketPrice ?? null
    const pnlPct =
      current && journal.entry_price > 0
        ? ((current - journal.entry_price) / journal.entry_price) * 100
        : null
    const stance: DailyAiBrief["holdingsCoach"][number]["stance"] =
      pnlPct == null ? "wait" : pnlPct <= -8 ? "reduce" : pnlPct >= 12 ? "hold" : "wait"
    const confidence = pnlPct == null ? 45 : Math.max(40, Math.min(85, 58 + Math.round((pnlPct ?? 0) * 1.1)))
    const upper = Math.round(journal.entry_price * 1.1).toLocaleString("ko-KR")
    const lower = Math.round(journal.entry_price * 0.96).toLocaleString("ko-KR")
    const stopPrice = journal.stop_loss > 0 ? journal.stop_loss : journal.entry_price * 0.95
    const stop = stopPrice.toLocaleString("ko-KR")
    const qty = Math.max(1, journal.quantity || 1)
    const expectedProfit = Math.round((journal.entry_price * 1.1 - journal.entry_price) * qty)
    const stopLoss = Math.round(Math.max(0, (journal.entry_price - stopPrice) * qty))

    return {
      name: journal.company_name,
      ticker: journal.ticker,
      stance,
      confidence,
      thesis:
        pnlPct == null
          ? "실시간 시세가 없어 판단 보류입니다. 보유 시나리오와 손절 기준을 먼저 점검하세요."
          : pnlPct >= 0
            ? `현재 수익 구간(${pnlPct.toFixed(2)}%)입니다. 목표가/분할 익절 계획대로 대응하면 보유 우위입니다.`
            : `현재 손실 구간(${pnlPct.toFixed(2)}%)입니다. 반등 기대보다는 손실 통제 우선이 필요합니다.`,
      expectedRange: `${lower} ~ ${upper}원`,
      expectedProfitAmount: `약 +${expectedProfit.toLocaleString("ko-KR")}원`,
      stopGuide: `${stop}원 이탈 시 비중 축소 또는 청산 검토`,
      stopLossAmount: `약 -${stopLoss.toLocaleString("ko-KR")}원`,
      riskTrigger:
        (quote?.changePercent ?? 0) <= -3
          ? "당일 급락 지속 + 손절가 이탈"
          : "거래대금 약화 + 전일 저점 하회",
    }
  })
}

function normalizeStance(value: unknown): DailyAiBrief["holdingsCoach"][number]["stance"] {
  return value === "hold" || value === "reduce" || value === "exit" || value === "wait"
    ? value
    : "wait"
}

function normalizeReason(reason: string) {
  const trimmed = reason.trim()
  if (!trimmed) return "테마: 재확인 필요 | 대장 근거: 뉴스/수급 확인 후 접근"
  if (/^테마:/i.test(trimmed)) return trimmed
  return `테마: 재확인 필요 | 대장 근거: ${trimmed}`
}

function normalizeRisk(risk: string) {
  const trimmed = risk.trim()
  if (!trimmed) return "손절 기준과 거래대금 유지 여부를 먼저 확인하세요."
  return trimmed
}

function enrichWatchlist(items: DailyAiBrief["watchlist"], context: BriefContext) {
  const signalMap = buildKoreaSignalLookup(context)
  const ranked: RankedWatchItem[] = items.map((item) => {
    const signal = signalMap.get(item.ticker)
    const ranks = [
      signal?.popularRank ? `검색 ${signal.popularRank}위` : null,
      signal?.gainersRank ? `상승 ${signal.gainersRank}위` : null,
      signal?.activeRank ? `거래 ${signal.activeRank}위` : null,
    ]
      .filter(Boolean)
      .join(" · ")
    const changeText =
      signal?.changePercent != null
        ? `${signal.changePercent >= 0 ? "+" : ""}${signal.changePercent.toFixed(2)}%`
        : null
    const relationHint = item.relation ? ` 보유/최근 매매 연관: ${item.relation}` : ""

    const reason = (() => {
      const base = normalizeReason(item.reason)
      if (base.includes("재확인 필요") && ranks) {
        return `${base}. 시장 위치는 ${ranks}${changeText ? `, 변동률 ${changeText}` : ""}입니다.${relationHint}`
      }
      return `${base}${ranks ? ` (시장 위치: ${ranks}${changeText ? ` / 변동률 ${changeText}` : ""})` : ""}${relationHint}`
    })()

    const risk = (() => {
      const base = normalizeRisk(item.risk)
      if (signal?.changePercent == null) return base
      if (Math.abs(signal.changePercent) >= 8) {
        return `급등락 과열 구간입니다. ${base}`
      }
      if (Math.abs(signal.changePercent) >= 4) {
        return `변동성 확대 구간입니다. ${base}`
      }
      return `추세 확인 구간입니다. ${base}`
    })()

    return {
      ...item,
      reason,
      risk,
      __score: scoreWatchItem(item, signal, context),
    }
  })

  return ranked
    .sort((a, b) => b.__score - a.__score)
    .map(({ __score, ...item }) => item)
}

function scoreWatchItem(
  item: DailyAiBrief["watchlist"][number],
  signal: KoreaSignal | undefined,
  context: BriefContext
) {
  let score = 0

  // 1) 거래대금/거래 순위 가중치 (최대 45)
  if (signal?.activeRank) {
    score += Math.max(0, 30 - (signal.activeRank - 1) * 3)
  }
  if (signal?.popularRank) {
    score += Math.max(0, 12 - (signal.popularRank - 1))
  }
  if (signal?.gainersRank) {
    score += Math.max(0, 10 - (signal.gainersRank - 1))
  }

  // 2) 변동률 구간 점수 (최대 25)
  const cp = signal?.changePercent
  if (cp != null) {
    const abs = Math.abs(cp)
    if (cp > 0) score += Math.min(20, cp * 2)
    if (abs >= 3 && abs <= 9) score += 8 // 적정 변동성
    if (abs > 12) score -= 6 // 과열/급락 페널티
  }

  // 3) 뉴스 매칭 점수 (최대 30)
  const key = item.ticker.trim().toUpperCase()
  const loweredName = item.name.toLowerCase()
  const relatedCount = context.relatedNews.filter(
    (n) =>
      (n.relatedTicker ?? "").toUpperCase() === key ||
      (n.relatedLabel ?? "").toLowerCase().includes(loweredName)
  ).length
  score += relatedCount * 10

  const headlineHit = context.headlines.filter((n) =>
    n.title.toLowerCase().includes(loweredName)
  ).length
  score += Math.min(10, headlineHit * 3)

  if (item.relation) score += 4

  return Math.round(score * 10) / 10
}

function getModelCandidates() {
  const preferred = getGeminiModel()
  const fallbacks = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"]
  return [...new Set([preferred, ...fallbacks])]
}

function formatGeminiError(status: number, errorText: string) {
  if (status === 429) {
    return "Gemini API 사용 한도에 도달했습니다. Google AI Studio에서 결제/할당량을 확인하거나 잠시 후 다시 시도해주세요."
  }

  if (status === 403) {
    return "Gemini API 키 권한이 없습니다. API 키와 프로젝트 설정을 확인해주세요."
  }

  return `Gemini API 오류 (${status}): ${errorText.slice(0, 160)}`
}

async function callGemini(prompt: string) {
  const apiKey = getGeminiApiKey()
  let lastError = "Gemini API 호출에 실패했습니다."

  for (const model of getModelCandidates()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      lastError = formatGeminiError(response.status, errorText)
      continue
    }

    const payload = await response.json()
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text || typeof text !== "string") {
      lastError = "Gemini 응답 형식이 올바르지 않습니다."
      continue
    }

    return JSON.parse(text) as unknown
  }

  throw new Error(lastError)
}

export async function generateDailyMarketBrief(context: BriefContext): Promise<DailyAiBrief> {
  const cacheKey = buildCacheKey(context.session)
  const cached = briefCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.brief
  }

  const raw = await callGemini(buildPrompt(context))
  const brief = normalizeBrief(raw, context)

  briefCache.set(cacheKey, {
    brief,
    expiresAt: Date.now() + BRIEF_CACHE_MS,
  })

  return brief
}
