const CONTROL =
  /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/

export function parseDisplayName(
  input: string,
): { ok: true; value: string } | { ok: false; error: string } {
  if (CONTROL.test(input)) {
    return { ok: false, error: "That name uses characters this form doesn’t accept." }
  }
  const value = input.trim()
  if (CONTROL.test(value) || value.length < 1 || value.length > 80) {
    return { ok: false, error: "Use 1–80 characters." }
  }
  return { ok: true, value }
}
