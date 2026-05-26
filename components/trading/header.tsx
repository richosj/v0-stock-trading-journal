"use client";

import { BookOpen, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: "/dashboard", label: "대시보드" },
    { href: "/journal", label: "매매 일지" },
    { href: "/create", label: "새 일지" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
              <BookOpen className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-bold text-foreground text-sm">
                매매 복기 일지
              </span>
              <span className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded">
                Demo
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Settings */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="설정"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">나</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
