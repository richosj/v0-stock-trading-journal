import type { LucideIcon } from "lucide-react"
import {
  Activity,
  Bitcoin,
  BookOpen,
  Globe,
  LayoutDashboard,
  Lightbulb,
  PlusCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  shortLabel?: string
  icon: LucideIcon
  mobileTab?: boolean
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "대시보드", shortLabel: "홈", icon: LayoutDashboard, mobileTab: true },
  { href: "/holdings", label: "실시간 보유", shortLabel: "보유", icon: Activity },
  { href: "/market/kr", label: "오늘의 국장", shortLabel: "국장", icon: TrendingUp, mobileTab: true },
  { href: "/market/us", label: "오늘의 미장", shortLabel: "미장", icon: Globe, mobileTab: true },
  { href: "/market/crypto", label: "코인 뉴스", shortLabel: "코인", icon: Bitcoin },
  { href: "/journal", label: "매매 일지", shortLabel: "일지", icon: BookOpen, mobileTab: true },
  { href: "/recommendations", label: "추천 종목", icon: Sparkles },
  { href: "/insights", label: "복기 인사이트", icon: Lightbulb },
]

export const CREATE_NAV: NavItem = {
  href: "/create",
  label: "새 일지",
  icon: PlusCircle,
}

export function buildNavItems(canWrite: boolean): NavItem[] {
  return canWrite ? [...PRIMARY_NAV, CREATE_NAV] : PRIMARY_NAV
}

export function buildMobileTabItems(_canWrite: boolean): NavItem[] {
  return PRIMARY_NAV.filter((item) => item.mobileTab)
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
