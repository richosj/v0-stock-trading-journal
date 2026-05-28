import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth/server'
import {
  createJournalFillForSession,
  listJournalFillsForSession,
} from '@/lib/server-trading-service'
import type { NewTradingJournalFill } from '@/lib/supabase'
import { handleRouteError } from '@/lib/route-response'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuthSession()
    const { id } = await context.params
    const fills = await listJournalFillsForSession(session, id)
    return NextResponse.json({ fills })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuthSession()
    const { id } = await context.params
    const body = (await request.json()) as NewTradingJournalFill
    const journal = await createJournalFillForSession(session, id, body)
    return NextResponse.json({ journal })
  } catch (error) {
    return handleRouteError(error)
  }
}
