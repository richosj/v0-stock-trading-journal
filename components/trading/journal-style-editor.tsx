"use client"

import { JournalTemplatePicker } from "@/components/trading/journal-template-picker"
import { Button } from "@/components/ui/button"
import {
  buildJournalTemplatePatch,
  JOURNAL_STYLE_TEMPLATE_MAP,
  suggestPricesFromTemplate,
  type JournalTemplatePatch,
  type JournalTradeStyle,
} from "@/lib/journal-templates"
import { toast } from "sonner"

type JournalStyleEditorProps = {
  selectedStyle: JournalTradeStyle | null
  onStyleChange?: (style: JournalTradeStyle) => void
  onApply: (patch: Partial<JournalTemplatePatch>) => void
  entryPrice?: number
  existingStrategy?: string[]
  className?: string
}

export function JournalStyleEditor({
  selectedStyle,
  onStyleChange,
  onApply,
  entryPrice = 0,
  existingStrategy,
  className,
}: JournalStyleEditorProps) {
  const handleSelect = (style: JournalTradeStyle) => {
    onStyleChange?.(style)
    const patch = buildJournalTemplatePatch(style, {
      existingStrategy,
      entryPrice: entryPrice > 0 ? entryPrice : undefined,
      applyPrices: entryPrice > 0,
    })
    onApply(patch)
    const priceHint =
      entryPrice > 0
        ? " 목표가·손절가 제안값을 반영했습니다."
        : " 평균단가 입력 후 「가격 제안」을 눌러 주세요."
    toast.success(`${JOURNAL_STYLE_TEMPLATE_MAP[style].label} 템플릿을 적용했습니다.${priceHint}`)
  }

  const applyPricesOnly = () => {
    if (!selectedStyle) {
      toast.message("먼저 스윙·단타·배당을 선택해 주세요.")
      return
    }
    if (entryPrice <= 0) {
      toast.error("평균 매수가(또는 평균단가)를 먼저 확인해 주세요.")
      return
    }
    const template = JOURNAL_STYLE_TEMPLATE_MAP[selectedStyle]
    const suggested = suggestPricesFromTemplate(entryPrice, template)
    if (!suggested) return
    onApply({
      target_price: suggested.target,
      stop_loss: suggested.stop,
    })
    toast.success("목표가·손절가 제안값을 적용했습니다.")
  }

  return (
    <div className={className}>
      <JournalTemplatePicker value={selectedStyle} onSelect={handleSelect} />
      {selectedStyle ? (
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={applyPricesOnly}>
            템플릿 기준 목표·손절 제안
          </Button>
        </div>
      ) : null}
    </div>
  )
}
