'use client'

import { Header } from '@/components/trading/header'
import { JournalForm } from '@/components/trading/journal-form'

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">새 매매 일지 작성</h1>
        <JournalForm />
      </main>
    </div>
  )
}
