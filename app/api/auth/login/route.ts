import { NextRequest, NextResponse } from 'next/server'
import { attachSessionCookie, resolveSessionFromPin } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pin = typeof body?.pin === 'string' ? body.pin : ''
    const session = resolveSessionFromPin(pin)

    if (!session) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ session })
    attachSessionCookie(response, session.role)
    return response
  } catch {
    return NextResponse.json({ error: '로그인에 실패했습니다.' }, { status: 500 })
  }
}
