import type { LucideIcon } from "lucide-react"
import { CalendarRange, Coins, Zap } from "lucide-react"

export type JournalTradeStyle = "swing" | "day" | "dividend"

export type JournalStyleTemplate = {
  id: JournalTradeStyle
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
  tags: string[]
  reason: string
  scenarioNotes: string
  principleNotes: string
  /** 진입가 대비 목표가 비율 (예: 0.12 = +12%) */
  targetPercent: number
  /** 진입가 대비 손절가 비율 (예: -0.05 = -5%) */
  stopPercent: number
  defaultPrinciple: boolean
  /** 빠른 입력 시 상세 옵션 펼침 권장 */
  suggestAdvanced: boolean
}

export const JOURNAL_STYLE_TEMPLATES: JournalStyleTemplate[] = [
  {
    id: "swing",
    label: "스윙",
    shortLabel: "스윙",
    description: "수일~수주 보유, 추세·손익비 중심",
    icon: CalendarRange,
    tags: ["스윙", "추세 추종", "눌림목"],
    reason:
      "중기 추세가 유지되는 구간에서 진입했습니다. 지지/저항, 거래량, 손익비(최소 2:1)를 확인한 뒤 진입했습니다.",
    scenarioNotes:
      "① 목표가 도달 시 30~50% 분할 익절\n② 잔량은 추세선·이동평균 이탈 시 정리\n③ 손절가 이탈 시 계획대로 전량 청산\n④ 실적·이벤트 전후 포지션 축소 검토",
    principleNotes:
      "진입 전 차트와 손절·목표를 먼저 정합니다. 뉴스에 흔들려도 손절 규칙을 지킵니다. 추가 매수는 계획된 경우만 합니다.",
    targetPercent: 0.12,
    stopPercent: -0.05,
    defaultPrinciple: true,
    suggestAdvanced: true,
  },
  {
    id: "day",
    label: "단타",
    shortLabel: "단타",
    description: "당일~단기, 손절·시간 청산 우선",
    icon: Zap,
    tags: ["단타", "돌파", "거래량"],
    reason:
      "당일 변동성·거래량·가격 구조를 기준으로 진입했습니다. 장 시작/마감 구간 리스크와 손절 위치를 먼저 정했습니다.",
    scenarioNotes:
      "① 목표 구간 도달 시 분할 익절\n② 손절가 터치 시 즉시 청산(미루지 않음)\n③ 시간 손절: 장 마감 전 미청산 포지션 정리\n④ 본전 심리·추격 매수 금지",
    principleNotes:
      "손절이 최우선입니다. 하루 최대 손실 한도를 정하고 넘기지 않습니다. 계획 없는 재진입은 하지 않습니다.",
    targetPercent: 0.03,
    stopPercent: -0.015,
    defaultPrinciple: true,
    suggestAdvanced: true,
  },
  {
    id: "dividend",
    label: "배당",
    shortLabel: "배당",
    description: "배당·가치, 장기 현금흐름",
    icon: Coins,
    tags: ["배당", "가치", "장기 보유"],
    reason:
      "배당 안정성·배당 성장·재무 건전성을 기준으로 선별했습니다. 단기 시세보다 현금흐름과 보유 기간을 전제로 합니다.",
    scenarioNotes:
      "① 배당 삭감·펀더멘털 악화 시 재평가·축소\n② 배당락·이벤트는 일시 변동으로 보고 과잉 반응 금지\n③ 목표 수익률·배당 수익률 도달 시 일부 익절 검토\n④ 장기 보유 전제이나 손절 기준은 유지",
    principleNotes:
      "배당 재투자/현금 목적을 명확히 기록합니다. 뉴스 헤드라인만 보고 매매하지 않습니다. 분기 실적·배당 정책 변화를 정기 점검합니다.",
    targetPercent: 0.15,
    stopPercent: -0.08,
    defaultPrinciple: true,
    suggestAdvanced: true,
  },
]

export const JOURNAL_STYLE_TEMPLATE_MAP = Object.fromEntries(
  JOURNAL_STYLE_TEMPLATES.map((t) => [t.id, t])
) as Record<JournalTradeStyle, JournalStyleTemplate>

const ALL_TEMPLATE_TAGS = new Set(
  JOURNAL_STYLE_TEMPLATES.flatMap((t) => t.tags)
)

export function isTemplateTag(tag: string) {
  return ALL_TEMPLATE_TAGS.has(tag)
}

export function suggestPricesFromTemplate(
  entryPrice: number,
  template: JournalStyleTemplate
): { target: number; stop: number } | null {
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) return null

  const target = Math.round(entryPrice * (1 + template.targetPercent))
  const stop = Math.round(entryPrice * (1 + template.stopPercent))

  return {
    target: Math.max(target, 0),
    stop: Math.max(stop, 0),
  }
}

/** 전략 태그에서 스윙/단타/배당 스타일 추론 */
export function inferTradeStyleFromStrategy(
  strategy: string[] | null | undefined
): JournalTradeStyle | null {
  if (!strategy?.length) return null
  const set = new Set(strategy)
  if (set.has("스윙")) return "swing"
  if (set.has("단타")) return "day"
  if (set.has("배당")) return "dividend"
  return null
}

export function mergeStrategyWithTemplate(
  existingStrategy: string[] | undefined,
  style: JournalTradeStyle
): string[] {
  const template = JOURNAL_STYLE_TEMPLATE_MAP[style]
  const custom = (existingStrategy ?? []).filter((tag) => !isTemplateTag(tag))
  return [...new Set([...template.tags, ...custom])]
}

export type JournalTemplatePatch = {
  reason: string
  scenario_notes: string
  principle_notes: string
  strategy: string[]
  is_principle: boolean
  target_price?: number
  stop_loss?: number
}

/** 작성/수정 폼에 넣을 필드 패치 생성 */
export function buildJournalTemplatePatch(
  style: JournalTradeStyle,
  options?: {
    existingStrategy?: string[]
    entryPrice?: number
    applyPrices?: boolean
  }
): JournalTemplatePatch {
  const template = JOURNAL_STYLE_TEMPLATE_MAP[style]
  const patch: JournalTemplatePatch = {
    reason: template.reason,
    scenario_notes: template.scenarioNotes,
    principle_notes: template.principleNotes,
    strategy: mergeStrategyWithTemplate(options?.existingStrategy, style),
    is_principle: template.defaultPrinciple,
  }

  const entry = options?.entryPrice ?? 0
  if (options?.applyPrices !== false && entry > 0) {
    const suggested = suggestPricesFromTemplate(entry, template)
    if (suggested) {
      patch.target_price = suggested.target
      patch.stop_loss = suggested.stop
    }
  }

  return patch
}

export function getStyleLabel(style: JournalTradeStyle | null): string | null {
  if (!style) return null
  return JOURNAL_STYLE_TEMPLATE_MAP[style].shortLabel
}
