import type { LiveQuote } from "@/lib/market-quotes";
import type { TradingJournal } from "@/lib/supabase";

type MonthlyReport = {
  month: string;
  label: string;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
};

type StrategyInsight = {
  strategy: string;
  count: number;
  totalPnl: number;
  winRate: number;
};

type MistakeInsight = {
  label: string;
  value: number;
  helper: string;
};

type StockInsight = {
  key: string;
  companyName: string;
  ticker: string;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
};

type PositionAlert = {
  journalId: string;
  companyName: string;
  type: "target-hit" | "target-near" | "stop-hit" | "stop-near";
  label: string;
  helper: string;
};

function getClosedJournals(journals: TradingJournal[]) {
  return journals.filter(
    (journal) => journal.exit_price != null && journal.pnl != null && journal.pnl_percent != null
  );
}

export function getMonthlyReports(journals: TradingJournal[]): MonthlyReport[] {
  const monthlyMap = new Map<
    string,
    { label: string; totalPnl: number; tradeCount: number; wins: number }
  >();

  for (const journal of getClosedJournals(journals)) {
    const baseDate = journal.exit_date || journal.trade_date;
    const date = new Date(baseDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
    });
    const current = monthlyMap.get(monthKey) ?? {
      label,
      totalPnl: 0,
      tradeCount: 0,
      wins: 0,
    };

    current.totalPnl += journal.pnl ?? 0;
    current.tradeCount += 1;
    if ((journal.pnl ?? 0) > 0) current.wins += 1;

    monthlyMap.set(monthKey, current);
  }

  return [...monthlyMap.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, 6)
    .map(([month, value]) => ({
      month,
      label: value.label,
      totalPnl: value.totalPnl,
      tradeCount: value.tradeCount,
      winRate: value.tradeCount > 0 ? (value.wins / value.tradeCount) * 100 : 0,
    }));
}

export function getStrategyInsights(journals: TradingJournal[]): StrategyInsight[] {
  const strategyMap = new Map<
    string,
    { count: number; totalPnl: number; wins: number }
  >();

  for (const journal of getClosedJournals(journals)) {
    const strategies = journal.strategy.length > 0 ? journal.strategy : ["일반"];

    for (const strategy of strategies) {
      const current = strategyMap.get(strategy) ?? { count: 0, totalPnl: 0, wins: 0 };
      current.count += 1;
      current.totalPnl += journal.pnl ?? 0;
      if ((journal.pnl ?? 0) > 0) current.wins += 1;
      strategyMap.set(strategy, current);
    }
  }

  return [...strategyMap.entries()]
    .map(([strategy, value]) => ({
      strategy,
      count: value.count,
      totalPnl: value.totalPnl,
      winRate: value.count > 0 ? (value.wins / value.count) * 100 : 0,
    }))
    .sort((left, right) => right.totalPnl - left.totalPnl)
    .slice(0, 5);
}

export function getMistakeInsights(journals: TradingJournal[]): MistakeInsight[] {
  const total = Math.max(journals.length, 1);
  const impulsiveCount = journals.filter((journal) => !journal.is_principle).length;
  const missingStopLossCount = journals.filter((journal) => (journal.stop_loss ?? 0) <= 0).length;
  const missingTargetCount = journals.filter((journal) => (journal.target_price ?? 0) <= 0).length;
  const shortReasonCount = journals.filter((journal) => (journal.reason ?? "").trim().length < 12).length;

  return [
    {
      label: "뇌동매매",
      value: impulsiveCount,
      helper: `${Math.round((impulsiveCount / total) * 100)}% 비중`,
    },
    {
      label: "손절가 미설정",
      value: missingStopLossCount,
      helper: `${Math.round((missingStopLossCount / total) * 100)}%가 손절 기준 없음`,
    },
    {
      label: "목표가 미설정",
      value: missingTargetCount,
      helper: `${Math.round((missingTargetCount / total) * 100)}%가 목표가 없음`,
    },
    {
      label: "복기 부족",
      value: shortReasonCount,
      helper: `이유가 짧은 기록 ${shortReasonCount}건`,
    },
  ];
}

export function getStockInsights(journals: TradingJournal[]): StockInsight[] {
  const stockMap = new Map<
    string,
    { companyName: string; ticker: string; totalPnl: number; tradeCount: number; wins: number }
  >();

  for (const journal of getClosedJournals(journals)) {
    const key = journal.ticker || journal.company_name;
    const current = stockMap.get(key) ?? {
      companyName: journal.company_name,
      ticker: journal.ticker,
      totalPnl: 0,
      tradeCount: 0,
      wins: 0,
    };

    current.totalPnl += journal.pnl ?? 0;
    current.tradeCount += 1;
    if ((journal.pnl ?? 0) > 0) current.wins += 1;

    stockMap.set(key, current);
  }

  return [...stockMap.entries()]
    .map(([key, value]) => ({
      key,
      companyName: value.companyName,
      ticker: value.ticker,
      totalPnl: value.totalPnl,
      tradeCount: value.tradeCount,
      winRate: value.tradeCount > 0 ? (value.wins / value.tradeCount) * 100 : 0,
    }))
    .sort((left, right) => right.totalPnl - left.totalPnl)
    .slice(0, 5);
}

export function getPositionAlerts(
  positions: TradingJournal[],
  quotes: LiveQuote[]
): PositionAlert[] {
  const quoteMap = new Map(quotes.map((quote) => [quote.journalId, quote]));
  const alerts: PositionAlert[] = [];

  for (const position of positions) {
    const quote = quoteMap.get(position.id);
    const currentPrice = quote?.regularMarketPrice;

    if (!currentPrice) continue;

    if (position.target_price > 0) {
      if (currentPrice >= position.target_price) {
        alerts.push({
          journalId: position.id,
          companyName: position.company_name,
          type: "target-hit",
          label: "목표가 도달",
          helper: `현재가 ${currentPrice.toLocaleString("ko-KR")}원이 목표가를 넘었습니다.`,
        });
      } else if (currentPrice >= position.target_price * 0.97) {
        alerts.push({
          journalId: position.id,
          companyName: position.company_name,
          type: "target-near",
          label: "목표가 근접",
          helper: `목표가까지 ${Math.max(position.target_price - currentPrice, 0).toLocaleString("ko-KR")}원 남았습니다.`,
        });
      }
    }

    if (position.stop_loss > 0) {
      if (currentPrice <= position.stop_loss) {
        alerts.push({
          journalId: position.id,
          companyName: position.company_name,
          type: "stop-hit",
          label: "손절가 이탈",
          helper: `현재가 ${currentPrice.toLocaleString("ko-KR")}원이 손절가 아래입니다.`,
        });
      } else if (currentPrice <= position.stop_loss * 1.03) {
        alerts.push({
          journalId: position.id,
          companyName: position.company_name,
          type: "stop-near",
          label: "손절가 근접",
          helper: `손절가까지 ${Math.max(currentPrice - position.stop_loss, 0).toLocaleString("ko-KR")}원 남았습니다.`,
        });
      }
    }
  }

  return alerts.slice(0, 6);
}
