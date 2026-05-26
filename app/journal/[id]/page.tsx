'use client'

import { Header } from '@/components/trading/header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import {
  fetchJournalById,
  updateJournal,
  deleteJournal,
  fetchJournalFills,
  createJournalFill,
  deleteJournalFill,
} from '@/lib/trading-service'
import type { TradingJournal, TradingJournalFill } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, Save, X, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  calculateAverageCostRollup,
  formatCurrency,
  formatNumericInput,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercent,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '@/lib/trading-calculations'
import { useAuth } from '@/components/auth-provider'
import { getOwnerLabel } from '@/lib/auth/shared'

export default function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { session } = useAuth()
  const [journal, setJournal] = useState<TradingJournal | null>(null)
  const [fills, setFills] = useState<TradingJournalFill[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<TradingJournal>>({})
  const [saving, setSaving] = useState(false)
  const [fillMode, setFillMode] = useState<'buy' | 'sell' | null>(null)
  const [fillPrice, setFillPrice] = useState('')
  const [fillQuantity, setFillQuantity] = useState('')
  const [fillDate, setFillDate] = useState(new Date().toISOString().slice(0, 10))
  const [fillMemo, setFillMemo] = useState('')
  const [fillSaving, setFillSaving] = useState(false)
  const [deletingFillId, setDeletingFillId] = useState<string | null>(null)
  const canWrite = session?.canWrite ?? false

  const updateEditData = (patch: Partial<TradingJournal>) => {
    setEditData((prev) => ({ ...prev, ...patch }))
  }

  const formatEditableNumber = (value: number | null | undefined) =>
    value == null ? '' : formatNumericInput(String(value))

  const resetFillForm = () => {
    setFillMode(null)
    setFillPrice('')
    setFillQuantity('')
    setFillDate(new Date().toISOString().slice(0, 10))
    setFillMemo('')
  }

  const loadJournalData = async () => {
    const { id } = await params
    const [journalData, fillData] = await Promise.all([
      fetchJournalById(id),
      fetchJournalFills(id),
    ])
    setJournal(journalData)
    setFills(fillData)
  }

  useEffect(() => {
    const loadJournal = async () => {
      setLoading(true)
      try {
        await loadJournalData()
      } catch (err: any) {
        console.error('[v0] Detail load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadJournal()
  }, [params])

  const startEdit = () => {
    if (!canWrite) return
    if (journal) {
      setEditData({
        company_name: journal.company_name,
        ticker: journal.ticker,
        target_price: journal.target_price,
        stop_loss: journal.stop_loss,
        trade_date: journal.trade_date,
        reason: journal.reason,
        is_principle: journal.is_principle,
        scenario_notes: journal.scenario_notes,
        principle_notes: journal.principle_notes,
      })
      setIsEditing(true)
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditData({})
  }

  const handleSave = async () => {
    if (!canWrite) return
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
    if (!canWrite) return
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

  const handleAddFill = async () => {
    if (!canWrite) return
    if (!journal || !fillMode) return
    const price = Number(fillPrice)
    const quantity = Number(fillQuantity)

    if (!price || !quantity || !fillDate) {
      toast.error('체결 가격, 수량, 날짜를 입력해주세요.')
      return
    }

    if (fillMode === 'sell' && quantity > remainingQuantity) {
      toast.error('현재 보유 수량보다 많이 매도할 수 없습니다.')
      return
    }

    setFillSaving(true)
    try {
      const result = await createJournalFill({
        journal_id: journal.id,
        fill_type: fillMode,
        price,
        quantity,
        fill_date: fillDate,
        memo: fillMemo.trim() || null,
        sort_order: fills.filter((fill) => fill.fill_date === fillDate).length,
      })

      if (!result) {
        toast.error('체결 추가에 실패했습니다.')
        return
      }

      await loadJournalData()
      resetFillForm()
      toast.success(fillMode === 'buy' ? '추매가 기록되었습니다.' : '매도 체결이 기록되었습니다.')
    } catch (error: any) {
      toast.error(error?.message || '체결 추가 중 오류가 발생했습니다.')
    } finally {
      setFillSaving(false)
    }
  }

  const handleDeleteFill = async (fillId: string) => {
    if (!canWrite) return
    if (!journal) return
    if (!confirm('이 체결 내역을 삭제하시겠습니까?')) return

    setDeletingFillId(fillId)
    try {
      const result = await deleteJournalFill(journal.id, fillId)
      if (!result) {
        toast.error('체결 삭제에 실패했습니다.')
        return
      }

      await loadJournalData()
      toast.success('체결 내역을 삭제했습니다.')
    } catch (error: any) {
      toast.error(error?.message || '체결 삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingFillId(null)
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

  const rollup = calculateAverageCostRollup(fills)
  const remainingQuantity = rollup.openQuantity
  const averageEntryPrice = rollup.averageEntryPrice || journal.entry_price
  const realizedPnl = rollup.realizedPnl
  const realizedPercent = rollup.realizedPnlPercent
  const isProfit = realizedPnl >= 0
  const totalBoughtLabel = formatQuantity(rollup.totalBoughtQuantity)
  const totalSoldLabel = formatQuantity(rollup.totalSoldQuantity)
  const ownerLabel = getOwnerLabel(journal.owner_key)

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
            {isEditing && canWrite ? (
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
            ) : canWrite ? (
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
            ) : (
              <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                마스터 계정은 조회만 가능합니다.
              </div>
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
                  <p className="text-sm text-muted-foreground">소유자</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{ownerLabel}</p>
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
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {journal.exit_date ? new Date(journal.exit_date).toLocaleDateString('ko-KR') : '-'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">포지션 요약</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">평균단가</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {remainingQuantity > 0 ? formatCurrency(averageEntryPrice) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">보유 수량</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatQuantity(remainingQuantity)}
                  </p>
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
                  <p className="text-sm text-muted-foreground">최근 매도가</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {rollup.lastSellPrice != null ? formatCurrency(rollup.lastSellPrice) : '-'}
                  </p>
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

            <Card className="p-6 bg-card border-border">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">체결 내역</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    1차 매수, 추매, 부분매도 내역을 순서대로 기록합니다.
                  </p>
                </div>
                {canWrite ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={fillMode === 'buy' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFillMode(fillMode === 'buy' ? null : 'buy')}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      추매 추가
                    </Button>
                    <Button
                      type="button"
                      variant={fillMode === 'sell' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFillMode(fillMode === 'sell' ? null : 'sell')}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      매도 추가
                    </Button>
                  </div>
                ) : null}
              </div>

              {fillMode && (
                <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">가격</p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatNumericInput(fillPrice)}
                        onChange={(e) => setFillPrice(sanitizeDecimalInput(e.target.value))}
                      title="체결 가격"
                      aria-label="체결 가격"
                        className="w-full mt-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono text-foreground"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">수량</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumericInput(fillQuantity)}
                        onChange={(e) => setFillQuantity(sanitizeIntegerInput(e.target.value))}
                      title="체결 수량"
                      aria-label="체결 수량"
                        className="w-full mt-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono text-foreground"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">날짜</p>
                      <input
                        type="date"
                        value={fillDate}
                        onChange={(e) => setFillDate(e.target.value)}
                      title="체결 날짜"
                      aria-label="체결 날짜"
                        className="w-full mt-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground [color-scheme:light]"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">메모</p>
                    <input
                      type="text"
                      value={fillMemo}
                      onChange={(e) => setFillMemo(e.target.value)}
                      title="체결 메모"
                      aria-label="체결 메모"
                      className="w-full mt-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                      placeholder={fillMode === 'buy' ? '예: 2차 매수' : '예: 1차 매도'}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={resetFillForm}>
                      취소
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddFill}
                      disabled={fillSaving}
                    >
                      {fillSaving ? '저장 중...' : fillMode === 'buy' ? '추매 저장' : '매도 저장'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-5 space-y-3">
                {fills.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                    아직 기록된 체결 내역이 없습니다.
                  </div>
                ) : (
                  fills.map((fill) => (
                    <div
                      key={fill.id}
                      className="rounded-xl border border-border bg-secondary/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={fill.fill_type === 'buy' ? 'default' : 'secondary'}>
                              {fill.fill_type === 'buy' ? '매수' : '매도'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(fill.fill_date).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(fill.price)} · {formatQuantity(fill.quantity)}
                          </p>
                          {fill.memo && (
                            <p className="text-sm text-muted-foreground">{fill.memo}</p>
                          )}
                        </div>
                        {canWrite ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteFill(fill.id)}
                            disabled={deletingFillId === fill.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">체결 요약</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-sm text-muted-foreground">누적 매수 / 매도</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {totalBoughtLabel} / {totalSoldLabel}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-sm text-muted-foreground">남은 수량</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {formatQuantity(remainingQuantity)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-sm text-muted-foreground">누적 실현 손익</p>
                  <p
                    className={`mt-2 text-2xl font-bold ${
                      isProfit ? 'text-profit' : 'text-loss'
                    }`}
                  >
                    {formatSignedCurrency(realizedPnl)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-sm text-muted-foreground">누적 실현 수익률</p>
                  <p
                    className={`mt-2 text-2xl font-bold ${
                      isProfit ? 'text-profit' : 'text-loss'
                    }`}
                  >
                    {formatSignedPercent(realizedPercent, 2)}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                체결 내역을 기준으로 평균단가 방식으로 자동 계산됩니다.
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
