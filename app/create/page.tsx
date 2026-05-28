'use client'

import { Header } from '@/components/trading/header'
import { JournalForm } from '@/components/trading/journal-form'
import { useAuth } from '@/components/auth-provider'

export default function CreatePage() {
  const { session } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">새 매매 일지 작성</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            스윙 · 단타 · 배당 템플릿을 고르면 매매 이유, 시나리오, 태그, 목표/손절 가이드가 자동으로 채워집니다.
          </p>
        </div>
        {session?.canWrite ? (
          <JournalForm />
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            마스터 계정은 조회만 가능합니다. 작성은 `0406` 또는 `0706`으로 로그인해 주세요.
          </div>
        )}
      </main>
    </div>
  )
}
