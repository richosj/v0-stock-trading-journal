"use client"

import { cn } from "@/lib/utils"
import {
  getStyleLabel,
  inferTradeStyleFromStrategy,
  JOURNAL_STYLE_TEMPLATE_MAP,
  type JournalTradeStyle,
} from "@/lib/journal-templates"

type JournalStyleBadgeProps = {
  strategy: string[] | null | undefined
  style?: JournalTradeStyle | null
  className?: string
}

export function JournalStyleBadge({ strategy, style: styleProp, className }: JournalStyleBadgeProps) {
  const style = styleProp ?? inferTradeStyleFromStrategy(strategy)
  const label = getStyleLabel(style)
  if (!style || !label) return null

  const Icon = JOURNAL_STYLE_TEMPLATE_MAP[style].icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-semibold text-primary",
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  )
}
