import type { TradingJournal } from './supabase'

export const dummyJournals: TradingJournal[] = [
  {
    id: '1',
    ticker: 'NVDA',
    company_name: '엔비디아',
    trade_type: 'buy',
    entry_price: 875000,
    quantity: 10,
    target_price: 950000,
    stop_loss: 800000,
    trade_date: '2024-12-15',
    exit_date: '2024-12-22',
    exit_price: 920000,
    pnl: 450000,
    pnl_percent: 5.14,
    reason: 'AI 반도체 수요 급증으로 인한 실적 기대감',
    scenario_notes: 'B100 시리즈 출하량 예상치 초과 전망',
    strategy: ['AI 테마', '반도체'],
    is_principle: true,
    principle_notes: '기술적 분석 기반 돌파 매매',
    status: 'closed',
    created_at: new Date('2024-12-15').toISOString(),
    updated_at: new Date('2024-12-22').toISOString(),
  },
  {
    id: '2',
    ticker: 'TSLA',
    company_name: '테슬라',
    trade_type: 'buy',
    entry_price: 320000,
    quantity: 5,
    target_price: 360000,
    stop_loss: 290000,
    trade_date: '2024-12-18',
    exit_date: null,
    exit_price: null,
    pnl: null,
    pnl_percent: null,
    reason: '전기차 시장 성장 및 에너지 사업 다각화',
    scenario_notes: '신모델 출시 반응 긍정적',
    strategy: ['뉴스 호재', '이벤트 기대'],
    is_principle: true,
    principle_notes: null,
    status: 'open',
    created_at: new Date('2024-12-18').toISOString(),
    updated_at: new Date('2024-12-18').toISOString(),
  },
  {
    id: '3',
    ticker: 'AAPL',
    company_name: '애플',
    trade_type: 'buy',
    entry_price: 245000,
    quantity: 8,
    target_price: 270000,
    stop_loss: 220000,
    trade_date: '2024-12-10',
    exit_date: '2024-12-12',
    exit_price: 240000,
    pnl: -40000,
    pnl_percent: -2.04,
    reason: '아이폰 판매 부진 우려',
    scenario_notes: '기술 분석 신호 무시',
    strategy: ['뇌동매매'],
    is_principle: false,
    principle_notes: '심리적 불안감에 의한 충동 매매',
    status: 'closed',
    created_at: new Date('2024-12-10').toISOString(),
    updated_at: new Date('2024-12-12').toISOString(),
  },
  {
    id: '4',
    ticker: 'SAMSUNG',
    company_name: '삼성전자',
    trade_type: 'buy',
    entry_price: 70000,
    quantity: 15,
    target_price: 80000,
    stop_loss: 63000,
    trade_date: '2024-12-16',
    exit_date: null,
    exit_price: null,
    pnl: null,
    pnl_percent: null,
    reason: '메모리 반도체 수요 회복 신호',
    scenario_notes: '반도체 가격 상승 기대',
    strategy: ['반도체', '가치 저평가'],
    is_principle: true,
    principle_notes: null,
    status: 'open',
    created_at: new Date('2024-12-16').toISOString(),
    updated_at: new Date('2024-12-16').toISOString(),
  },
  {
    id: '5',
    ticker: 'GOOGL',
    company_name: '알파벳(구글)',
    trade_type: 'sell',
    entry_price: 185000,
    quantity: 3,
    target_price: 170000,
    stop_loss: 200000,
    trade_date: '2024-12-14',
    exit_date: '2024-12-19',
    exit_price: 172000,
    pnl: 39000,
    pnl_percent: 7.03,
    reason: '상승 과정 대량 매도 물량 관찰',
    scenario_notes: '기술적 저항선 근처에서 반발',
    strategy: ['차트 돌파', '외국인 매도'],
    is_principle: true,
    principle_notes: null,
    status: 'closed',
    created_at: new Date('2024-12-14').toISOString(),
    updated_at: new Date('2024-12-19').toISOString(),
  },
]

export const calculateStats = (journals: TradingJournal[]) => {
  const closedJournals = journals.filter((j) => j.status === 'closed')
  const openJournals = journals.filter((j) => j.status === 'open')

  const totalPnL = closedJournals.reduce((sum, j) => sum + (j.pnl || 0), 0)

  const totalInvested = closedJournals.reduce(
    (sum, j) => sum + j.entry_price * j.quantity,
    0
  )

  const profitableTrades = closedJournals.filter((j) => (j.pnl || 0) > 0).length
  const winRate =
    closedJournals.length > 0
      ? (profitableTrades / closedJournals.length) * 100
      : 0

  const principleTrades = journals.filter((j) => j.is_principle).length
  const principleRate =
    journals.length > 0 ? (principleTrades / journals.length) * 100 : 0

  const totalPnLPercent =
    totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  return {
    totalPnL,
    totalPnLPercent,
    winRate,
    openPositions: openJournals.length,
    principleRate,
  }
}
