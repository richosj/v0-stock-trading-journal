import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth/server'
import {
  createJournalForSession,
  listJournalsForSession,
} from '@/lib/server-trading-service'
import type { NewTradingJournal } from '@/lib/supabase'
import { handleRouteError } from '@/lib/route-response'

export async function GET() {
  try {
    const session = await requireAuthSession()
    const journals = await listJournalsForSession(session)
    return NextResponse.json({ journals })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthSession()
    const body = (await request.json()) as NewTradingJournal
    const journal = await createJournalForSession(session, body)
    return NextResponse.json({ journal })
  } catch (error) {
    return handleRouteError(error)
  }
}
