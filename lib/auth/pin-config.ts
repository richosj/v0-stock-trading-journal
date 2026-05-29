import type { AppRole } from "./shared"

const DEFAULT_PINS: Record<AppRole, string> = {
  wife: "0406",
  owner: "0706",
  master: "1021",
}

function pinFromEnv(value: string | undefined, fallback: string) {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

export function buildPinRoleMap() {
  const entries: Array<[string, AppRole]> = [
    [pinFromEnv(process.env.TRADING_PIN_WIFE, DEFAULT_PINS.wife), "wife"],
    [pinFromEnv(process.env.TRADING_PIN_OWNER, DEFAULT_PINS.owner), "owner"],
    [pinFromEnv(process.env.TRADING_PIN_MASTER, DEFAULT_PINS.master), "master"],
  ]

  const map: Record<string, AppRole> = {}
  for (const [pin, role] of entries) {
    map[pin] = role
  }

  const pins = entries.map(([pin]) => pin)
  if (new Set(pins).size !== pins.length) {
    console.warn(
      "[auth] TRADING_PIN_WIFE / TRADING_PIN_OWNER / TRADING_PIN_MASTER 값이 중복되었습니다. 환경변수를 확인하세요."
    )
  }

  return map
}

export function normalizePinInput(pin: string) {
  return pin.trim().replace(/\s/g, "")
}
