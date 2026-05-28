import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/server'

export async function GET() {
  const session = await getAuthSession()

  if (!session) {
    return NextResponse.json({ session: null }, { status: 401 })
  }

  return NextResponse.json({ session })
}
