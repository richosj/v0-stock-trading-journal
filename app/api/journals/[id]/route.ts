import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth/server'
import {
  deleteJournalForSession,
  getJournalByIdForSession,
  updateJournalForSession,
} from '@/lib/server-trading-service'
import type { NewTradingJournal } from '@/lib/supabase'
import { handleRouteError } from '@/lib/route-response'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuthSession()
    const { id } = await context.params
    const journal = await getJournalByIdForSession(session, id)
    return NextResponse.json({ journal })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuthSession()
    const { id } = await context.params
    const body = (await request.json()) as Partial<NewTradingJournal>
    const journal = await updateJournalForSession(session, id, body)
    return NextResponse.json({ journal })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuthSession()
    const { id } = await context.params
    await deleteJournalForSession(session, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
