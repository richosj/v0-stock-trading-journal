import { NextRequest, NextResponse } from 'next/server'
import { attachSessionCookie, resolveSessionFromPin } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pin = typeof body?.pin === 'string' ? body.pin : ''
    const session = resolveSessionFromPin(pin)

    if (!session) {
      const hint =
        process.env.NODE_ENV === 'development'
          ? '로컬 기본 PIN: 0406(와이프) / 0706(오너) / 1021(마스터). .env의 TRADING_PIN_*가 비어 있지 않은지 확인하세요.'
          : undefined
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.', hint },
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
