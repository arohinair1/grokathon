export const ACCOUNTS_UNAVAILABLE = "Accounts are unavailable right now."

export const EMAIL_LINK_MESSAGE =
  "If that address can receive a link, we've sent one. If nothing arrives in a few minutes, try again later."

export type AuthFormState = {
  error?: string
  message?: string
  /** Name to show after this action. Present on a successful save and on a rejected edit. */
  displayName?: string
}

/** The account form must not fall back to a stale server name after a save. */
export function shownDisplayName(serverName: string, state: AuthFormState): string {
  return state.displayName ?? serverName
}

export function blankAuthState(): AuthFormState {
  return {}
}

export function isPlausibleEmail(value: string): boolean {
  if (value.length < 3 || value.length > 320) return false
  const at = value.indexOf("@")
  return at > 0 && value.lastIndexOf(".") > at + 1 && !value.includes(" ")
}

export function isAcceptablePassword(value: string): boolean {
  return value.length >= 8 && value.length <= 72
}
