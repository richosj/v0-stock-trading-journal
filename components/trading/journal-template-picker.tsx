"use client"

import { cn } from "@/lib/utils"
import {
  JOURNAL_STYLE_TEMPLATES,
  type JournalTradeStyle,
} from "@/lib/journal-templates"
import { Check } from "lucide-react"

type JournalTemplatePickerProps = {
  value: JournalTradeStyle | null
  onSelect: (style: JournalTradeStyle) => void
  className?: string
}

export function JournalTemplatePicker({
  value,
  onSelect,
  className,
}: JournalTemplatePickerProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-sm font-semibold text-foreground">매매 스타일 템플릿</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          스윙 · 단타 · 배당 중 선택하면 이유·시나리오·태그·목표/손절 가이드가 채워집니다.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {JOURNAL_STYLE_TEMPLATES.map((template) => {
          const Icon = template.icon
          const active = value === template.id

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={cn(
                "relative flex flex-col rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/25"
                  : "border-border bg-secondary/20 hover:border-primary/30 hover:bg-secondary/40"
              )}
            >
              {active ? (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              ) : null}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  active ? "bg-primary text-primary-foreground" : "bg-background text-primary"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{template.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {template.description}
              </p>
              <p className="mt-2 text-[10px] font-medium text-muted-foreground/80">
                목표 약 +{Math.round(template.targetPercent * 100)}% · 손절 약{" "}
                {Math.round(template.stopPercent * 100)}%
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
