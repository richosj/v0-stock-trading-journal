import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth/server'
import { deleteJournalFillForSession } from '@/lib/server-trading-service'
import { handleRouteError } from '@/lib/route-response'

type RouteContext = {
  params: Promise<{ id: string; fillId: string }>
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuthSession()
    const { id, fillId } = await context.params
    const journal = await deleteJournalFillForSession(session, id, fillId)
    return NextResponse.json({ journal })
  } catch (error) {
    return handleRouteError(error)
  }
}
