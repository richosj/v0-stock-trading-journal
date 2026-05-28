"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { buildMobileTabItems, isNavActive } from "@/lib/nav-config"

type MobileBottomNavProps = {
  onOpenMenu: () => void
}

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname()
  const { session } = useAuth()
  const tabs = buildMobileTabItems(session?.canWrite ?? false)

  const menuActive =
    pathname.startsWith("/recommendations") ||
    pathname.startsWith("/insights") ||
    pathname.startsWith("/create") ||
    pathname === "/market"

  useEffect(() => {
    document.body.classList.add("has-mobile-bottom-nav")
    return () => document.body.classList.remove("has-mobile-bottom-nav")
  }, [])

  return (
    <nav
      data-mobile-nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="하단 메뉴"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
        {tabs.map((item) => {
          const Icon = item.icon
          const active = isNavActive(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-110")} aria-hidden />
              <span className="truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium transition-colors",
            menuActive ? "text-primary" : "text-muted-foreground"
          )}
          aria-label="전체 메뉴 열기"
        >
          <Menu className="h-5 w-5" aria-hidden />
          <span>더보기</span>
        </button>
      </div>
    </nav>
  )
}
