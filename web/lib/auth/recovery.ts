/** Set only after a password-recovery code is exchanged. An ordinary login does not set it. */
export const RECOVERY_COOKIE = "cs-recovery"

export function hasRecoveryContext(value: string | undefined): boolean {
  return value === "1"
}
