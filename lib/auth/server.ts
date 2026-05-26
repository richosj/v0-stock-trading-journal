import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { buildAuthSession, type AppRole, type AuthSession } from './shared'
import { HttpError } from '@/lib/http-error'

const AUTH_COOKIE_NAME = 'trading_journal_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14

const PIN_ROLE_MAP: Record<string, AppRole> = {
  [process.env.TRADING_PIN_WIFE ?? '0406']: 'wife',
  [process.env.TRADING_PIN_OWNER ?? '0706']: 'owner',
  [process.env.TRADING_PIN_MASTER ?? '1021']: 'master',
}

function getSessionSecret() {
  return process.env.PIN_AUTH_SECRET ?? 'v0-stock-trading-journal-pin-secret'
}

function signPayload(payload: string) {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url')
}

function createSessionToken(role: AppRole) {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  const payload = `${role}.${expiresAt}`
  const signature = signPayload(payload)

  return `${payload}.${signature}`
}

function parseSessionToken(token: string): AuthSession | null {
  const [roleValue, expiresAtValue, signature] = token.split('.')

  if (!roleValue || !expiresAtValue || !signature) {
    return null
  }

  if (!['wife', 'owner', 'master'].includes(roleValue)) {
    return null
  }

  const payload = `${roleValue}.${expiresAtValue}`
  const expectedSignature = signPayload(payload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  const expiresAt = Number(expiresAtValue)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null
  }

  return buildAuthSession(roleValue as AppRole)
}

export function resolveSessionFromPin(pin: string) {
  const normalizedPin = pin.trim()
  const role = PIN_ROLE_MAP[normalizedPin]

  return role ? buildAuthSession(role) : null
}

export async function getAuthSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  return parseSessionToken(token)
}

export async function requireAuthSession() {
  const session = await getAuthSession()

  if (!session) {
    throw new HttpError(401, '로그인이 필요합니다.')
  }

  return session
}

export function assertWritableSession(session: AuthSession) {
  if (!session.canWrite) {
    throw new HttpError(403, '마스터 계정은 조회만 가능합니다.')
  }
}

export function attachSessionCookie(response: NextResponse, role: AppRole) {
  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(role), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}
