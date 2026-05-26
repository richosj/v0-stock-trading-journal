import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nzzaspeqnardonydimzn.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56emFzcGVxbmFyZG9ueWRpbXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzI5NjYsImV4cCI6MjA5Mzc0ODk2Nn0.h0VjwKbLYAOSxRUmpKIwX6Lg8q6SvuaYX2jnCW7tV1k";

const supabase = createClient(supabaseUrl, supabaseKey);

const sampleData = [
  {
    ticker: "NVDA",
    company_name: "엔비디아",
    trade_type: "buy",
    entry_price: 125.5,
    quantity: 10,
    target_price: 145.0,
    stop_loss: 110.0,
    trade_date: "2025-05-15",
    reason: "AI 반도체 수요 급증. B100 시리즈 실적 기대감",
    strategy: ["차트 돌파", "실적 기대"],
    is_principle: true,
    status: "open",
    exit_price: null,
    exit_date: null,
    pnl: null,
    pnl_percent: null,
    scenario_notes: "월선 저항선 돌파 후 익절",
    principle_notes: "기술적 분석 기반 진입",
  },
  {
    ticker: "TSLA",
    company_name: "테슬라",
    trade_type: "buy",
    entry_price: 238.75,
    quantity: 5,
    target_price: 280.0,
    stop_loss: 220.0,
    trade_date: "2025-05-12",
    reason: "FSD 베타 개선 뉴스로 기술주 강세",
    strategy: ["뉴스 호재", "AI 테마"],
    is_principle: false,
    status: "open",
    exit_price: null,
    exit_date: null,
    pnl: null,
    pnl_percent: null,
    scenario_notes: null,
    principle_notes: "뉴스에 급동했음",
  },
  {
    ticker: "AAPL",
    company_name: "애플",
    trade_type: "buy",
    entry_price: 182.3,
    quantity: 15,
    target_price: 200.0,
    stop_loss: 170.0,
    trade_date: "2025-05-08",
    reason: "분기 실적 우호적. 배당 예상",
    strategy: ["실적 기대", "가치 저평가"],
    is_principle: true,
    status: "closed",
    exit_price: 195.5,
    exit_date: "2025-05-18",
    pnl: 1978.5,
    pnl_percent: 7.24,
    scenario_notes: "목표가 도달하지 못했으나 익절",
    principle_notes: "계획대로 진행",
  },
  {
    ticker: "MSFT",
    company_name: "마이크로소프트",
    trade_type: "buy",
    entry_price: 416.25,
    quantity: 3,
    target_price: 450.0,
    stop_loss: 390.0,
    trade_date: "2025-05-10",
    reason: "클라우드 사업 호조. AI 투자 확대",
    strategy: ["AI 테마", "차트 돌파"],
    is_principle: true,
    status: "open",
    exit_price: null,
    exit_date: null,
    pnl: null,
    pnl_percent: null,
    scenario_notes: "월선 저항 넘으면 추가 매수",
    principle_notes: "펀더멘탈 기반",
  },
  {
    ticker: "GOOGL",
    company_name: "구글",
    trade_type: "buy",
    entry_price: 178.9,
    quantity: 8,
    target_price: 200.0,
    stop_loss: 165.0,
    trade_date: "2025-04-20",
    reason: "검색 광고 회복. Gemini 출시",
    strategy: ["AI 테마"],
    is_principle: true,
    status: "closed",
    exit_price: 172.5,
    exit_date: "2025-05-02",
    pnl: -51.2,
    pnl_percent: -3.58,
    scenario_notes: "손절매",
    principle_notes: "손절 규칙 준수",
  },
  {
    ticker: "META",
    company_name: "메타",
    trade_type: "buy",
    entry_price: 512.3,
    quantity: 2,
    target_price: 580.0,
    stop_loss: 480.0,
    trade_date: "2025-05-14",
    reason: "생성형 AI 투자 회수 기대",
    strategy: ["AI 테마", "외국인 매수"],
    is_principle: false,
    status: "open",
    exit_price: null,
    exit_date: null,
    pnl: null,
    pnl_percent: null,
    scenario_notes: null,
    principle_notes: "외국인 추적 매매",
  },
  {
    ticker: "AMZN",
    company_name: "아마존",
    trade_type: "sell",
    entry_price: 185.5,
    quantity: 6,
    target_price: 170.0,
    stop_loss: 200.0,
    trade_date: "2025-05-16",
    reason: "실적 부진. 매출 증속 부족",
    strategy: ["뉴스 호재"],
    is_principle: true,
    status: "open",
    exit_price: null,
    exit_date: null,
    pnl: null,
    pnl_percent: null,
    scenario_notes: "지지선 이하 추가 공매도",
    principle_notes: "기술적 분석",
  },
  {
    ticker: "NFLX",
    company_name: "넷플릭스",
    trade_type: "buy",
    entry_price: 245.2,
    quantity: 4,
    target_price: 280.0,
    stop_loss: 220.0,
    trade_date: "2025-05-01",
    reason: "광고 매출 성장. 유료 공유 수익화",
    strategy: ["실적 기대", "외국인 매수"],
    is_principle: true,
    status: "closed",
    exit_price: 265.8,
    exit_date: "2025-05-17",
    pnl: 82.4,
    pnl_percent: 8.44,
    scenario_notes: "목표가 미달 익절",
    principle_notes: "계획 매도",
  },
];

async function insertSampleData() {
  try {
    console.log("Inserting sample data...");
    const { data, error } = await supabase
      .from("trading_journals")
      .insert(sampleData)
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      process.exit(1);
    }

    console.log(`✓ Successfully inserted ${data.length} trading journals`);
    console.log("Sample data:");
    data.forEach((d: any) => {
      console.log(
        `  - ${d.company_name} (${d.ticker}): ${d.trade_type === "buy" ? "매수" : "매도"} ${d.quantity}주 @ ₩${d.entry_price}`
      );
    });
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

insertSampleData();
