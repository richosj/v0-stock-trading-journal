import { NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth/server'
import { getJournalStatsForSession } from '@/lib/server-trading-service'
import { handleRouteError } from '@/lib/route-response'

export async function GET() {
  try {
    const session = await requireAuthSession()
    const stats = await getJournalStatsForSession(session)
    return NextResponse.json({ stats })
  } catch (error) {
    return handleRouteError(error)
  }
}
