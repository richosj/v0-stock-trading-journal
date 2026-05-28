"use client"

import { useState, type ComponentType } from "react"
import { BookOpen, LogOut, Menu, Sparkles } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { buildNavItems, isNavActive } from "@/lib/nav-config"
import { ScrollToTop } from "@/components/trading/scroll-to-top"
import { MobileBottomNav } from "@/components/trading/mobile-bottom-nav"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

export function Header() {
  const pathname = usePathname()
  const { session, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = buildNavItems(session?.canWrite ?? false)

  const NavLink = ({
    href,
    label,
    icon: Icon,
    onNavigate,
    large,
  }: {
    href: string
    label: string
    icon: ComponentType<{ className?: string }>
    onNavigate?: () => void
    large?: boolean
  }) => {
    const active = isNavActive(pathname, href)

    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-xl font-medium transition-colors",
          large ? "px-4 py-3.5 text-base" : "px-3 py-2 text-sm",
          active
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-secondary/80"
        )}
      >
        <Icon className={cn("shrink-0", large ? "h-5 w-5" : "h-4 w-4")} aria-hidden />
        {label}
      </Link>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-sm">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold text-foreground sm:text-base">
                  매매 복기 일지
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {session?.label ?? "미인증"}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    <Sparkles className="h-2.5 w-2.5" />
                    TRADE OS
                  </span>
                </div>
              </div>
            </Link>

            {/* Desktop navigation */}
            <nav
              className="hidden lg:flex flex-1 items-center justify-center gap-0.5 px-4"
              aria-label="메인 메뉴"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors xl:px-3",
                    isNavActive(pathname, item.href)
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
                aria-label="메뉴 열기"
              >
                <Menu className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="hidden sm:inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                aria-label="로그아웃"
              >
                <LogOut className="h-4 w-4" />
                <span>로그아웃</span>
              </button>

              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/15 shadow-sm"
                title={session?.label ?? ""}
              >
                <span className="text-xs font-bold text-primary">
                  {session?.label?.slice(0, 1) ?? "?"}
                </span>
              </div>
            </div>
          </div>

          {/* Tablet: wrapped grid (no horizontal scroll) */}
          <nav
            className="hidden md:grid lg:hidden grid-cols-3 gap-1 border-t border-border/60 py-2"
            aria-label="태블릿 메뉴"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-2 py-2 text-center text-xs font-medium transition-colors",
                  isNavActive(pathname, item.href)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/70"
                )}
              >
                {item.shortLabel ?? item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex h-full w-[min(100vw-2rem,320px)] flex-col p-0">
          <SheetHeader className="border-b border-border p-4 text-left">
            <SheetTitle>메뉴</SheetTitle>
            <SheetDescription>
              {session?.label ?? "게스트"} · 원하는 화면으로 이동하세요
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-1 p-3">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                large
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
          </div>

          <div className="mt-auto border-t border-border p-4">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                logout()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <MobileBottomNav onOpenMenu={() => setMenuOpen(true)} />
      <ScrollToTop />
    </>
  )
}
