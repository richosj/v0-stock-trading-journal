export type TradeType = "매수" | "매도";
export type TradeStatus = "보유중" | "청산완료";
export type PrincipleTag = "원칙매매" | "뇌동매매";

export interface TradeEntry {
  id: string;
  stockName: string;
  ticker: string;
  tradeType: TradeType;
  entryDate: string;
  targetDate: string;
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  quantity: number;
  currentPrice?: number;
  exitPrice?: number;
  status: TradeStatus;
  reason: string;
  scenario: string;
  tags: string[];
  principleTag: PrincipleTag;
  pnl?: number;
  pnlRate?: number;
}

export const dummyTrades: TradeEntry[] = [
  {
    id: "1",
    stockName: "엔비디아",
    ticker: "NVDA",
    tradeType: "매수",
    entryDate: "2025-05-10",
    targetDate: "2025-05-24",
    entryPrice: 118500,
    targetPrice: 135000,
    stopLossPrice: 110000,
    quantity: 10,
    currentPrice: 125300,
    status: "보유중",
    reason:
      "AI 반도체 수요 급증으로 인한 실적 기대감. B100/B200 시리즈 출하량이 예상치를 초과할 것으로 분석됨. 데이터센터 CAPEX 확대 추세 지속.",
    scenario:
      "1차 목표가 $135 도달 시 50% 익절 후 나머지는 $145까지 보유. 손절선 $110 이탈 시 전량 청산. 실적 발표일(5/28) 이전 포지션 정리 예정.",
    tags: ["실적 기대", "AI 테마", "차트 돌파"],
    principleTag: "원칙매매",
    pnl: 68000,
    pnlRate: 5.74,
  },
  {
    id: "2",
    stockName: "삼성전자",
    ticker: "005930",
    tradeType: "매수",
    entryDate: "2025-05-05",
    targetDate: "2025-05-20",
    entryPrice: 72400,
    targetPrice: 80000,
    stopLossPrice: 68000,
    quantity: 30,
    currentPrice: 71200,
    status: "보유중",
    reason:
      "HBM3E 양산 확대 발표 및 파운드리 수주 회복 기대. 외국인 순매수 전환 포착. PBR 1.0 지지선 근처에서 가치 저평가 판단.",
    scenario:
      "단기 반등 시나리오. 목표가 8만원 저항선 돌파 확인 후 추가 매수 검토. 기한 내 목표가 미달 시 손익 무관하게 전량 청산.",
    tags: ["가치 저평가", "외국인 매수", "반도체"],
    principleTag: "원칙매매",
    pnl: -36000,
    pnlRate: -1.66,
  },
  {
    id: "3",
    stockName: "테슬라",
    ticker: "TSLA",
    tradeType: "매수",
    entryDate: "2025-04-28",
    targetDate: "2025-05-12",
    entryPrice: 172000,
    targetPrice: 195000,
    stopLossPrice: 158000,
    quantity: 5,
    exitPrice: 188500,
    status: "청산완료",
    reason:
      "단순히 커뮤니티에서 급등 예측 글을 보고 충동적으로 매수. 뚜렷한 기술적 근거 없음. FSD 소식에 기대.",
    scenario: "특별한 시나리오 없이 분위기에 편승한 매매였음. 반성 필요.",
    tags: ["뇌동매매", "뉴스 호재"],
    principleTag: "뇌동매매",
    pnl: 82500,
    pnlRate: 9.59,
  },
  {
    id: "4",
    stockName: "카카오",
    ticker: "035720",
    tradeType: "매수",
    entryDate: "2025-04-15",
    targetDate: "2025-05-01",
    entryPrice: 38500,
    targetPrice: 46000,
    stopLossPrice: 35000,
    quantity: 50,
    exitPrice: 36200,
    status: "청산완료",
    reason:
      "AI 서비스 확장 기대. 카카오뱅크·페이 성장성 재평가 가능성. 과매도 구간 진입으로 단기 반등 노림.",
    scenario:
      "5월 실적 발표 전 반등 시나리오. 예상대로 전개되지 않아 손절선 이탈로 규율에 따라 청산.",
    tags: ["가치 저평가", "AI 테마", "차트 돌파"],
    principleTag: "원칙매매",
    pnl: -115000,
    pnlRate: -5.97,
  },
  {
    id: "5",
    stockName: "애플",
    ticker: "AAPL",
    tradeType: "매수",
    entryDate: "2025-05-14",
    targetDate: "2025-06-10",
    entryPrice: 196500,
    targetPrice: 220000,
    stopLossPrice: 183000,
    quantity: 8,
    currentPrice: 201800,
    status: "보유중",
    reason:
      "WWDC 2025 앞두고 AI 기능 탑재 발표 기대. 아이폰 17 사전 주문 호조 전망. 기술적으로 200일 이동평균선 상향 돌파 확인.",
    scenario:
      "WWDC 이벤트 전후 변동성 확대 예상. 이벤트 당일 갭업 시 50% 익절 후 나머지 분할 매도. $183 손절선은 절대 지킬 것.",
    tags: ["이벤트 기대", "차트 돌파", "실적 기대"],
    principleTag: "원칙매매",
    pnl: 42400,
    pnlRate: 2.70,
  },
  {
    id: "6",
    stockName: "하이브",
    ticker: "352820",
    tradeType: "매수",
    entryDate: "2025-05-02",
    targetDate: "2025-05-16",
    entryPrice: 215000,
    targetPrice: 250000,
    stopLossPrice: 200000,
    quantity: 4,
    exitPrice: 198000,
    status: "청산완료",
    reason:
      "BTS 컴백 소식 관련 기대 매수. 앨범 발매 예정일 전 선취매 전략. 엔터주 전반적 강세 흐름.",
    scenario:
      "앨범 발매 당일 차익실현 예정이었으나 손절선 이탈로 먼저 청산됨. 원칙 준수.",
    tags: ["이벤트 기대", "뉴스 호재"],
    principleTag: "원칙매매",
    pnl: -68000,
    pnlRate: -7.91,
  },
];

export function calcDashboardStats(trades: TradeEntry[]) {
  const closed = trades.filter((t) => t.status === "청산완료");
  const open = trades.filter((t) => t.status === "보유중");

  const totalPnl = trades.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
  const totalInvested = trades.reduce(
    (acc, t) => acc + t.entryPrice * t.quantity,
    0
  );
  const totalPnlRate = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

  const principleCount = trades.filter(
    (t) => t.principleTag === "원칙매매"
  ).length;
  const principleRate =
    trades.length > 0 ? (principleCount / trades.length) * 100 : 0;

  return {
    totalPnl,
    totalPnlRate,
    winRate,
    openPositions: open.length,
    principleRate,
    impulsiveCount: trades.length - principleCount,
    principleCount,
  };
}

export function getDaysRemaining(targetDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}
