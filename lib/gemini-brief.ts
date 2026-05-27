import "server-only"

import type { AuthSession } from "@/lib/auth/shared"
import type { TradingJournal } from "@/lib/supabase"
import type { KoreaMarketSnapshot, UsNewsItem } from "@/lib/market-feed"
import type { DailyAiBrief } from "@/lib/gemini-brief-types"

export type { DailyAiBrief } from "@/lib/gemini-brief-types"

type BriefContext = {
  session: AuthSession
  journals: TradingJournal[]
  korea: KoreaMarketSnapshot
  headlines: UsNewsItem[]
  relatedNews: UsNewsItem[]
}

const DEFAULT_MODEL = "gemini-2.0-flash"
const BRIEF_CACHE_MS = 60 * 60 * 1000

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
  return `${session.role}:${session.ownerKey ?? "all"}:${hourBucket}`
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

function buildPrompt(context: BriefContext) {
  const journalSummary = summarizeJournals(context.journals)

  return `당신은 개인 매매일지 앱의 복기 코치입니다. 투자 권유가 아니라 "오늘 무엇을 볼지" 브리핑을 작성합니다.

규칙:
- 한국어로 작성
- 매수/매도 추천, 수익 보장, 단정적 예측 금지
- watchlist는 3~5개, 시장 데이터와 뉴스, 사용자 보유 종목을 근거로 작성
- ETF/ETN/레버리지 상품은 watchlist에서 제외하고 일반 주식 위주
- holdingsNotes는 사용자 보유(미청산) 종목만, 없으면 빈 배열
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

다음 JSON 스키마를 따르세요:
{
  "summary": "오늘 시장 한 줄 요약",
  "marketMood": "risk-on | risk-off | mixed",
  "watchlist": [
    {
      "name": "종목명",
      "ticker": "티커 또는 종목코드",
      "reason": "왜 주목할지",
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
  "caution": "오늘 매매 시 한 줄 주의사항"
}`
}

function normalizeBrief(raw: unknown): DailyAiBrief {
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
    watchlist: Array.isArray(payload.watchlist)
      ? payload.watchlist
          .filter((item) => item?.name)
          .slice(0, 5)
          .map((item) => ({
            name: String(item.name),
            ticker: String(item.ticker ?? ""),
            reason: String(item.reason ?? ""),
            risk: String(item.risk ?? ""),
            relation: item.relation ? String(item.relation) : null,
          }))
      : [],
    holdingsNotes: Array.isArray(payload.holdingsNotes)
      ? payload.holdingsNotes
          .filter((item) => item?.name)
          .slice(0, 6)
          .map((item) => ({
            name: String(item.name),
            ticker: String(item.ticker ?? ""),
            note: String(item.note ?? ""),
          }))
      : [],
    caution: payload.caution?.trim() || "충동 매매 없이 계획된 진입만 검토하세요.",
    generatedAt: new Date().toISOString(),
  }
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
  const brief = normalizeBrief(raw)

  briefCache.set(cacheKey, {
    brief,
    expiresAt: Date.now() + BRIEF_CACHE_MS,
  })

  return brief
}
