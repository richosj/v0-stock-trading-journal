import { NextResponse } from 'next/server'
import { HttpError } from '@/lib/http-error'

export function handleRouteError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  return NextResponse.json(
    { error: '요청 처리 중 오류가 발생했습니다.' },
    { status: 500 }
  )
}
