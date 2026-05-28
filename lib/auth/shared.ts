export type AppRole = 'wife' | 'owner' | 'master'

export type OwnerKey = Exclude<AppRole, 'master'>

export type AuthSession = {
  role: AppRole
  ownerKey: OwnerKey | null
  label: string
  canWrite: boolean
  canReadAll: boolean
}

export const ROLE_LABELS: Record<AppRole, string> = {
  wife: '와이프',
  owner: '내 계정',
  master: '마스터',
}

export function buildAuthSession(role: AppRole): AuthSession {
  const ownerKey = role === 'master' ? null : role

  return {
    role,
    ownerKey,
    label: ROLE_LABELS[role],
    canWrite: role !== 'master',
    canReadAll: role === 'master',
  }
}

export function getOwnerLabel(ownerKey: OwnerKey) {
  return ROLE_LABELS[ownerKey]
}
