"use client"

import type { ReactNode } from "react"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type PageHeroProps = {
  badge?: string
  title: string
  description: string
  rightSlot?: ReactNode
  stats?: ReactNode
  className?: string
}

export function PageHero({
  badge = "TRADE OS",
  title,
  description,
  rightSlot,
  stats,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-6 shadow-sm sm:p-7",
        className
      )}
    >
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-profit/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {badge}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>

      {stats ? <div className="relative mt-5">{stats}</div> : null}
    </section>
  )
}

