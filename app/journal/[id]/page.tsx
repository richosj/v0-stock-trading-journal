'use client'

import { Header } from '@/components/trading/header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { fetchJournalById, updateJournal, deleteJournal } from '@/lib/trading-service'
import { TradingJournal } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, Save, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  calculateJournalMetrics,
  formatCurrency,
  formatNumericInput,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercent,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '@/lib/trading-calculations'

export default function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [journal, setJournal] = useState<TradingJournal | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<TradingJournal>>({})
  const [saving, setSaving] = useState(false)

  const updateEditData = (patch: Partial<TradingJournal>) => {
    setEditData((prev) => {
      if (!journal) {
        return { ...prev, ...patch }
      }

      const next = { ...prev, ...patch }
      const merged = { ...journal, ...next }

      const metrics = calculateJournalMetrics({
        entry_price: merged.entry_price,
        quantity: merged.quantity,
        exit_price: merged.exit_price,
      })

      return {
        ...next,
        exit_date:
          merged.exit_price != null && merged.exit_price > 0
            ? next.exit_date || merged.exit_date || new Date().toISOString().slice(0, 10)
            : null,
        pnl: metrics?.pnl ?? null,
        pnl_percent: metrics?.pnl_percent ?? null,
      }
    })
  }

  const formatEditableNumber = (value: number | null | undefined) =>
    value == null ? '' : formatNumericInput(String(value))

  useEffect(() => {
    const loadJournal = async () => {
      setLoading(true)
      try {
        const { id } = await params
        console.log('[v0] Loading journal id:', id)
        const data = await fetchJournalById(id)
        console.log('[v0] Journal data:', data)
        setJournal(data)
      } catch (err: any) {
        console.error('[v0] Detail load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadJournal()
  }, [params])

  const startEdit = () => {
    if (journal) {
      setEditData({
        company_name: journal.company_name,
        ticker: journal.ticker,
        entry_price: journal.entry_price,
        quantity: journal.quantity,
        target_price: journal.target_price,
        stop_loss: journal.stop_loss,
        trade_date: journal.trade_date,
        reason: journal.reason,
        is_principle: journal.is_principle,
        exit_price: journal.exit_price,
        exit_date: journal.exit_date,
        pnl: journal.pnl,
        pnl_percent: journal.pnl_percent,
      })
      setIsEditing(true)
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditData({})
  }

  const handleSave = async () => {
    if (!journal) return
    setSaving(true)
    try {
      const result = await updateJournal(journal.id, editData)
      if (result) {
        setJournal(result)
        setIsEditing(false)
        toast.success('수정되었습니다.')
      } else {
        toast.error('수정에 실패했습니다.')
      }
    } catch (err: any) {
      toast.error(err?.message || '오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!journal) return
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      const success = await deleteJournal(journal.id)
      if (success) {
        toast.success('삭제되었습니다.')
        router.push('/journal')
      } else {
        toast.error('삭제에 실패했습니다.')
      }
    } catch (err) {
      toast.error('오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">데이터 불러오는 중...</div>
      </div>
    )
  }

  if (!journal) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-foreground text-lg mb-4">일지를 찾을 수 없습니다.</p>
            <Link href="/journal">
              <Button>목록으로 돌아가기</Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const displayExitPrice = isEditing
    ? editData.exit_price ?? null
    : journal.exit_price ?? null
  const pnl = isEditing ? editData.pnl ?? 0 : journal.pnl ?? 0
  const pnlPercent = isEditing ? editData.pnl_percent ?? 0 : journal.pnl_percent ?? 0
  const hasSellPrice = displayExitPrice != null && displayExitPrice > 0
  const hasCalculatedMetrics =
    hasSellPrice &&
    (isEditing
      ? editData.pnl != null && editData.pnl_percent != null
      : journal.pnl != null && journal.pnl_percent != null)
  const isProfit = pnl > 0

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/journal">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              목록으로
            </Button>
          </Link>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={cancelEdit} className="gap-2">
                  <X className="w-4 h-4" />
                  취소
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? '저장 중...' : '저장'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={startEdit} className="gap-2">
                  <Pencil className="w-4 h-4" />
                  수정
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  삭제
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">기본 정보</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">종목명</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.company_name || ''}
                      onChange={(e) => updateEditData({ company_name: e.target.value })}
                      title="종목명"
                      aria-label="종목명"
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold text-foreground">{journal.company_name}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">티커</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.ticker || ''}
                      onChange={(e) => updateEditData({ ticker: e.target.value.toUpperCase() })}
                      title="티커"
                      aria-label="티커"
                      placeholder="예: AAPL / 005930"
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {journal.ticker || '-'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">진입일</p>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editData.trade_date || ''}
                      onChange={(e) => updateEditData({ trade_date: e.target.value })}
                      title="진입일"
                      aria-label="진입일"
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground [color-scheme:light]"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {new Date(journal.trade_date).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">매도일</p>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editData.exit_date || ''}
                      onChange={(e) => updateEditData({ exit_date: e.target.value || null })}
                      title="매도일"
                      aria-label="매도일"
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground [color-scheme:light]"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {journal.exit_date ? new Date(journal.exit_date).toLocaleDateString('ko-KR') : '-'}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">가격 정보</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">진입가</p>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatEditableNumber(editData.entry_price)}
                      onChange={(e) =>
                        updateEditData({
                          entry_price: Number(sanitizeDecimalInput(e.target.value)) || 0,
                        })
                      }
                      title="진입가"
                      aria-label="진입가"
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatCurrency(journal.entry_price)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">수량</p>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatEditableNumber(editData.quantity)}
                      onChange={(e) =>
                        updateEditData({
                          quantity: Number(sanitizeIntegerInput(e.target.value)) || 0,
                        })
                      }
                      title="수량"
                      aria-label="수량"
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatQuantity(journal.quantity)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">목표가</p>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatEditableNumber(editData.target_price)}
                      onChange={(e) =>
                        updateEditData({
                          target_price: Number(sanitizeDecimalInput(e.target.value)) || 0,
                        })
                      }
                      title="목표가"
                      aria-label="목표가"
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-profit"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatCurrency(journal.target_price)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">손절가</p>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatEditableNumber(editData.stop_loss)}
                      onChange={(e) =>
                        updateEditData({
                          stop_loss: Number(sanitizeDecimalInput(e.target.value)) || 0,
                        })
                      }
                      title="손절가"
                      aria-label="손절가"
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-loss"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatCurrency(journal.stop_loss)}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">매도가</p>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatEditableNumber(editData.exit_price)}
                      onChange={(e) => {
                        const nextValue = sanitizeDecimalInput(e.target.value)
                        updateEditData({
                          exit_price: nextValue ? Number(nextValue) : null,
                        })
                      }}
                      title="매도가"
                      aria-label="매도가"
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground"
                      placeholder="매도가를 입력하면 손익이 자동 계산됩니다"
                    />
                  ) : (
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {hasSellPrice ? formatCurrency(journal.exit_price!) : '-'}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">매매 이유</h2>
              {isEditing ? (
                <textarea
                  value={editData.reason || ''}
                  onChange={(e) => updateEditData({ reason: e.target.value })}
                  rows={6}
                  title="매매 이유"
                  aria-label="매매 이유"
                  className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground resize-none"
                  placeholder="매매 이유를 입력하세요..."
                />
              ) : (
                <p className="text-foreground text-base leading-relaxed">
                  {journal.reason || '작성된 내용이 없습니다.'}
                </p>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">자동 계산 결과</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-sm text-muted-foreground">손익</p>
                  <p
                    className={`mt-2 text-2xl font-bold ${
                      !hasCalculatedMetrics
                        ? 'text-muted-foreground'
                        : isProfit
                        ? 'text-profit'
                        : 'text-loss'
                    }`}
                  >
                    {hasCalculatedMetrics ? formatSignedCurrency(pnl) : '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-sm text-muted-foreground">수익률</p>
                  <p
                    className={`mt-2 text-2xl font-bold ${
                      !hasCalculatedMetrics
                        ? 'text-muted-foreground'
                        : isProfit
                        ? 'text-profit'
                        : 'text-loss'
                    }`}
                  >
                    {hasCalculatedMetrics ? formatSignedPercent(pnlPercent, 2) : '-'}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                매도가를 입력하면 `(매도가 - 진입가) x 수량` 기준으로 자동 계산됩니다.
              </p>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">전략 및 분류</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">전략 태그</p>
                  <div className="flex flex-wrap gap-2">
                    {journal.strategy.map((s, i) => (
                      <Badge key={i} variant="outline">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">매매 유형</p>
                  <Badge variant={journal.is_principle ? 'default' : 'destructive'}>
                    {journal.is_principle ? '원칙매매' : '뇌동매매'}
                  </Badge>
                </div>
              </div>
            </Card>

            {journal.scenario_notes && (
              <Card className="p-6 bg-card border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">시나리오 노트</h2>
                <p className="text-foreground text-base leading-relaxed">
                  {journal.scenario_notes}
                </p>
              </Card>
            )}

            {journal.principle_notes && (
              <Card className="p-6 bg-card border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">원칙 준수 노트</h2>
                <p className="text-foreground text-base leading-relaxed">
                  {journal.principle_notes}
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
