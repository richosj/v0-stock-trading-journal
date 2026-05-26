import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function setupDatabase() {
  console.log('[v0] Starting database setup...')

  // Create trading_journals table
  const { error: createError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS trading_journals (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        company_name VARCHAR(100) NOT NULL,
        trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('buy', 'sell')),
        entry_price DECIMAL(15, 2) NOT NULL,
        quantity INTEGER NOT NULL,
        target_price DECIMAL(15, 2) DEFAULT 0,
        stop_loss DECIMAL(15, 2) DEFAULT 0,
        trade_date DATE NOT NULL,
        reason TEXT,
        strategy TEXT[] DEFAULT '{}',
        is_principle BOOLEAN DEFAULT true,
        status VARCHAR(10) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        exit_price DECIMAL(15, 2),
        exit_date DATE,
        pnl DECIMAL(15, 2),
        pnl_percent DECIMAL(10, 4),
        scenario_notes TEXT,
        principle_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  })

  if (createError) {
    console.log('[v0] RPC method not available, trying direct SQL...')
    
    // Try using raw SQL via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    })
    
    console.log('[v0] Will create table via Supabase Dashboard SQL Editor')
    console.log('[v0] Please run this SQL in your Supabase Dashboard:')
    console.log(`
-- Trading Journals Table
CREATE TABLE IF NOT EXISTS trading_journals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  entry_price DECIMAL(15, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  target_price DECIMAL(15, 2) DEFAULT 0,
  stop_loss DECIMAL(15, 2) DEFAULT 0,
  trade_date DATE NOT NULL,
  reason TEXT,
  strategy TEXT[] DEFAULT '{}',
  is_principle BOOLEAN DEFAULT true,
  status VARCHAR(10) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  exit_price DECIMAL(15, 2),
  exit_date DATE,
  pnl DECIMAL(15, 2),
  pnl_percent DECIMAL(10, 4),
  scenario_notes TEXT,
  principle_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE trading_journals ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (no auth)
CREATE POLICY "Allow all operations" ON trading_journals
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trading_journals_trade_date ON trading_journals(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_trading_journals_status ON trading_journals(status);
    `)
  } else {
    console.log('[v0] Table created successfully!')
  }

  // Insert sample data
  console.log('[v0] Inserting sample data...')
  
  const sampleData = [
    {
      ticker: 'NVDA',
      company_name: '엔비디아',
      trade_type: 'buy',
      entry_price: 135.50,
      quantity: 10,
      target_price: 150.00,
      stop_loss: 125.00,
      trade_date: '2025-05-15',
      reason: 'AI 반도체 수요 급증. B100 시리즈 출하량 예상치 초과 전망.',
      strategy: ['AI 테마', '실적 기대'],
      is_principle: true,
      status: 'open',
      scenario_notes: '목표가 도달 시 50% 익절, 나머지는 트레일링 스탑',
      principle_notes: '진입 전 차트 분석 완료, 손절가 설정 준수'
    },
    {
      ticker: '005930',
      company_name: '삼성전자',
      trade_type: 'buy',
      entry_price: 78500,
      quantity: 50,
      target_price: 85000,
      stop_loss: 75000,
      trade_date: '2025-05-10',
      reason: 'HBM3E 양산 본격화 및 AI 메모리 수요 증가',
      strategy: ['반도체', '가치 저평가'],
      is_principle: true,
      status: 'closed',
      exit_price: 82000,
      exit_date: '2025-05-18',
      pnl: 175000,
      pnl_percent: 4.46,
      scenario_notes: '목표가 전 일부 익절',
      principle_notes: '계획대로 진행'
    },
    {
      ticker: 'TSLA',
      company_name: '테슬라',
      trade_type: 'buy',
      entry_price: 180.25,
      quantity: 15,
      target_price: 200.00,
      stop_loss: 165.00,
      trade_date: '2025-05-08',
      reason: '로보택시 발표 기대감',
      strategy: ['이벤트 기대'],
      is_principle: false,
      status: 'closed',
      exit_price: 170.50,
      exit_date: '2025-05-12',
      pnl: -146.25,
      pnl_percent: -5.41,
      scenario_notes: null,
      principle_notes: '뇌동매매 - 손절가 없이 진입'
    },
    {
      ticker: 'AAPL',
      company_name: '애플',
      trade_type: 'buy',
      entry_price: 195.00,
      quantity: 20,
      target_price: 210.00,
      stop_loss: 185.00,
      trade_date: '2025-05-20',
      reason: 'WWDC 2025 AI 기능 발표 기대',
      strategy: ['이벤트 기대', 'AI 테마'],
      is_principle: true,
      status: 'open',
      scenario_notes: 'WWDC 후 재평가 예정',
      principle_notes: '원칙대로 진입'
    },
    {
      ticker: '035720',
      company_name: '카카오',
      trade_type: 'buy',
      entry_price: 42500,
      quantity: 100,
      target_price: 48000,
      stop_loss: 40000,
      trade_date: '2025-05-05',
      reason: '광고 사업 회복세 및 AI 서비스 확대',
      strategy: ['가치 저평가', 'AI 테마'],
      is_principle: true,
      status: 'closed',
      exit_price: 46500,
      exit_date: '2025-05-19',
      pnl: 400000,
      pnl_percent: 9.41,
      scenario_notes: '목표가 근접 시 전량 매도',
      principle_notes: '계획대로 익절 완료'
    }
  ]

  const { data, error: insertError } = await supabase
    .from('trading_journals')
    .insert(sampleData)
    .select()

  if (insertError) {
    console.log('[v0] Insert error:', insertError.message)
    console.log('[v0] Table might not exist yet. Please create it first.')
  } else {
    console.log('[v0] Sample data inserted successfully!', data?.length, 'records')
  }

  console.log('[v0] Database setup complete!')
}

setupDatabase().catch(console.error)
