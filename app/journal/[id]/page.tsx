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
import { cn } from '@/lib/utils'

export default function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [journal, setJournal] = useState<TradingJournal | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<TradingJournal>>({})
  const [saving, setSaving] = useState(false)

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
        trade_type: journal.trade_type,
        entry_price: journal.entry_price,
        quantity: journal.quantity,
        target_price: journal.target_price,
        stop_loss: journal.stop_loss,
        trade_date: journal.trade_date,
        reason: journal.reason,
        is_principle: journal.is_principle,
        status: journal.status,
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
    } catch (err) {
      toast.error('오류가 발생했습니다.')
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

  const pnl = journal.pnl || 0
  const pnlPercent = journal.pnl_percent || 0
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

        <div className="grid gap-6 max-w-2xl">
          {/* 기본 정보 */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">매매 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">종목</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.company_name || ''}
                    onChange={(e) => setEditData({ ...editData, company_name: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground"
                  />
                ) : (
                  <p className="text-lg font-semibold text-foreground">
                    {journal.company_name} ({journal.ticker})
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">매매유형</p>
                {isEditing ? (
                  <div className="flex rounded-lg border border-border overflow-hidden h-[38px] mt-1">
                    <button
                      type="button"
                      onClick={() => setEditData({ ...editData, trade_type: 'buy' })}
                      className={cn(
                        "flex-1 text-sm font-medium transition-colors",
                        editData.trade_type === 'buy'
                          ? "bg-profit text-white"
                          : "bg-secondary/60 text-muted-foreground"
                      )}
                    >
                      매수
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditData({ ...editData, trade_type: 'sell' })}
                      className={cn(
                        "flex-1 text-sm font-medium transition-colors",
                        editData.trade_type === 'sell'
                          ? "bg-loss text-white"
                          : "bg-secondary/60 text-muted-foreground"
                      )}
                    >
                      매도
                    </button>
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-foreground">
                    {journal.trade_type === 'buy' ? '매수' : '매도'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">매수 날짜</p>
                {isEditing ? (
                  <input
                    type="date"
                    value={editData.trade_date || ''}
                    onChange={(e) => setEditData({ ...editData, trade_date: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground [color-scheme:dark]"
                  />
                ) : (
                  <p className="text-lg font-semibold text-foreground">
                    {new Date(journal.trade_date).toLocaleDateString('ko-KR')}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">상태</p>
                {isEditing ? (
                  <div className="flex rounded-lg border border-border overflow-hidden h-[38px] mt-1">
                    <button
                      type="button"
                      onClick={() => setEditData({ ...editData, status: 'open' })}
                      className={cn(
                        "flex-1 text-sm font-medium transition-colors",
                        editData.status === 'open'
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/60 text-muted-foreground"
                      )}
                    >
                      진행중
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditData({ ...editData, status: 'closed' })}
                      className={cn(
                        "flex-1 text-sm font-medium transition-colors",
                        editData.status === 'closed'
                          ? "bg-secondary text-foreground"
                          : "bg-secondary/60 text-muted-foreground"
                      )}
                    >
                      종료
                    </button>
                  </div>
                ) : (
                  <Badge
                    variant={journal.status === 'open' ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {journal.status === 'open' ? '진행중' : '종료'}
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          {/* 가격 정보 */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">가격 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">진입가</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editData.entry_price || ''}
                    onChange={(e) => setEditData({ ...editData, entry_price: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground"
                  />
                ) : (
                  <p className="text-lg font-semibold text-foreground">
                    {journal.entry_price.toLocaleString()}원
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">수량</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editData.quantity || ''}
                    onChange={(e) => setEditData({ ...editData, quantity: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground"
                  />
                ) : (
                  <p className="text-lg font-semibold text-foreground">
                    {journal.quantity.toLocaleString()}주
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">목표가</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editData.target_price || ''}
                    onChange={(e) => setEditData({ ...editData, target_price: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-profit"
                  />
                ) : (
                  <p className="text-lg font-semibold text-foreground">
                    {journal.target_price.toLocaleString()}원
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">손절가</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={editData.stop_loss || ''}
                    onChange={(e) => setEditData({ ...editData, stop_loss: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-loss"
                  />
                ) : (
                  <p className="text-lg font-semibold text-foreground">
                    {journal.stop_loss.toLocaleString()}원
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* 손익 정보 - 청산 완료 또는 편집 모드에서 표시 */}
          {(journal.status === 'closed' || isEditing) && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">손익 정보</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">청산가</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.exit_price || ''}
                      onChange={(e) => {
                        const exitPrice = Number(e.target.value) || 0;
                        const entryPrice = editData.entry_price || journal.entry_price;
                        const qty = editData.quantity || journal.quantity;
                        const tradeType = editData.trade_type || journal.trade_type;
                        
                        // 손익 자동 계산
                        let calculatedPnl = 0;
                        if (exitPrice > 0 && entryPrice > 0) {
                          if (tradeType === 'buy') {
                            calculatedPnl = (exitPrice - entryPrice) * qty;
                          } else {
                            calculatedPnl = (entryPrice - exitPrice) * qty;
                          }
                        }
                        
                        // 수익률 자동 계산
                        const totalCost = entryPrice * qty;
                        const calculatedPnlPercent = totalCost > 0 ? (calculatedPnl / totalCost) * 100 : 0;
                        
                        setEditData({
                          ...editData,
                          exit_price: exitPrice || null,
                          pnl: calculatedPnl,
                          pnl_percent: Math.round(calculatedPnlPercent * 100) / 100,
                        });
                      }}
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground"
                      placeholder="0"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-foreground">
                      {journal.exit_price?.toLocaleString() || '-'}원
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">청산 날짜</p>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editData.exit_date || ''}
                      onChange={(e) => setEditData({ ...editData, exit_date: e.target.value || null })}
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground [color-scheme:dark]"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-foreground">
                      {journal.exit_date
                        ? new Date(journal.exit_date).toLocaleDateString('ko-KR')
                        : '-'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">손익</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.pnl || ''}
                      onChange={(e) => setEditData({ ...editData, pnl: Number(e.target.value) || null })}
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground"
                      placeholder="0"
                    />
                  ) : (
                    <p
                      className={`text-lg font-bold ${
                        isProfit ? 'text-profit' : 'text-loss'
                      }`}
                    >
                      {pnl.toLocaleString()}원
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">수익률</p>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editData.pnl_percent || ''}
                      onChange={(e) => setEditData({ ...editData, pnl_percent: Number(e.target.value) || null })}
                      className="w-full mt-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm font-mono text-foreground"
                      placeholder="0.00"
                    />
                  ) : (
                    <p
                      className={`text-lg font-bold ${
                        isProfit ? 'text-profit' : 'text-loss'
                      }`}
                    >
                      {pnlPercent.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* 전략 및 규칙 */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">전략 및 규칙</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">전략</p>
                <div className="flex flex-wrap gap-2">
                  {journal.strategy.map((s, i) => (
                    <Badge key={i} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">매매유형</p>
                <Badge
                  variant={journal.is_principle ? 'default' : 'destructive'}
                >
                  {journal.is_principle ? '원칙매매' : '뇌동매매'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* 매매 이유 */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">매매 이유</h2>
            {isEditing ? (
              <textarea
                value={editData.reason || ''}
                onChange={(e) => setEditData({ ...editData, reason: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground resize-none"
                placeholder="매매 이유를 입력하세요..."
              />
            ) : (
              <p className="text-foreground text-base leading-relaxed">
                {journal.reason || '작성된 내용이 없습니다.'}
              </p>
            )}
          </Card>

          {/* 시나리오 노트 */}
          {journal.scenario_notes && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                시나리오 노트
              </h2>
              <p className="text-foreground text-base leading-relaxed">
                {journal.scenario_notes}
              </p>
            </Card>
          )}

          {/* 원칙 노트 */}
          {journal.principle_notes && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                원칙 준수 노트
              </h2>
              <p className="text-foreground text-base leading-relaxed">
                {journal.principle_notes}
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
