"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { parseDisplayName } from "@/lib/display-name"
import { hasRecoveryContext, RECOVERY_COOKIE } from "@/lib/auth/recovery"
import { authCookieOptions } from "@/lib/supabase/auth-client"
import {
  ACCOUNTS_UNAVAILABLE,
  EMAIL_LINK_MESSAGE,
  isAcceptablePassword,
  isPlausibleEmail,
  type AuthFormState,
} from "@/lib/auth-copy"
import { safeNextPath } from "@/lib/safe-next"
import { siteOrigin } from "@/lib/site-url"
import { createServerAuthClient } from "@/lib/supabase/server"

function networkFailure(error: { status?: number; name?: string }): boolean {
  return error.status === 0 || error.name === "AuthRetryableFetchError"
}

async function clientOrUnavailable(): Promise<
  | { ok: true; supabase: NonNullable<Awaited<ReturnType<typeof createServerAuthClient>>>; origin: string }
  | { ok: false; state: AuthFormState }
> {
  const origin = siteOrigin()
  const supabase = await createServerAuthClient()
  if (!origin || !supabase) return { ok: false, state: { error: ACCOUNTS_UNAVAILABLE } }
  return { ok: true, supabase, origin }
}

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const ready = await clientOrUnavailable()
  if (!ready.ok) return ready.state
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!isPlausibleEmail(email)) return { error: "Enter a valid email address." }
  if (!isAcceptablePassword(password)) return { error: "Use 8–72 characters." }

  const { error } = await ready.supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.status === 429) return { error: "Too many attempts. Try again in a few minutes." }
    if (networkFailure(error)) return { error: ACCOUNTS_UNAVAILABLE }
    return { error: "That email and password didn’t match, or the address isn’t confirmed yet." }
  }
  redirect(safeNextPath(String(formData.get("next") ?? ""), ready.origin))
}

export async function signupAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const ready = await clientOrUnavailable()
  if (!ready.ok) return ready.state
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!isPlausibleEmail(email)) return { error: "Enter a valid email address." }
  if (!isAcceptablePassword(password)) return { error: "Use 8–72 characters." }

  const { data, error } = await ready.supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${ready.origin}/auth/callback` },
  })
  if (error) {
    if (error.code === "weak_password") return { error: "Use 8–72 characters." }
    if (error.status === 0) return { error: ACCOUNTS_UNAVAILABLE }
    return { message: EMAIL_LINK_MESSAGE }
  }
  if (data.session) redirect("/account")
  return { message: EMAIL_LINK_MESSAGE }
}

export async function forgotPasswordAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ready = await clientOrUnavailable()
  if (!ready.ok) return ready.state
  const email = String(formData.get("email") ?? "").trim()
  if (!isPlausibleEmail(email)) return { error: "Enter a valid email address." }

  const { error } = await ready.supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${ready.origin}/auth/recover`,
  })
  if (error && error.status === 0) return { error: ACCOUNTS_UNAVAILABLE }
  return { message: EMAIL_LINK_MESSAGE }
}

export async function resetPasswordAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ready = await clientOrUnavailable()
  if (!ready.ok) return ready.state
  const password = String(formData.get("password") ?? "")
  if (!isAcceptablePassword(password)) return { error: "Use 8–72 characters." }

  const { data, error: userError } = await ready.supabase.auth.getUser()
  if (userError || !data.user) redirect("/forgot-password")
  const cookieStore = await cookies()
  if (!hasRecoveryContext(cookieStore.get(RECOVERY_COOKIE)?.value)) {
    redirect("/forgot-password")
  }

  const { error } = await ready.supabase.auth.updateUser({ password })
  if (error) {
    if (networkFailure(error)) return { error: ACCOUNTS_UNAVAILABLE }
    return { error: "We couldn’t update that password. Request a new link and try again." }
  }
  const signedOut = await ready.supabase.auth.signOut({ scope: "others" })
  if (signedOut.error) {
    return {
      error: "Your password was updated, but other sessions may still be open. Sign out and back in.",
    }
  }
  cookieStore.set(RECOVERY_COOKIE, "", { ...authCookieOptions(), maxAge: 0 })
  redirect("/account?password=updated")
}

export async function updateProfileAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ready = await clientOrUnavailable()
  if (!ready.ok) return ready.state
  const parsed = parseDisplayName(String(formData.get("display_name") ?? ""))
  const submitted = String(formData.get("display_name") ?? "")
  if (!parsed.ok) return { error: parsed.error, displayName: submitted.slice(0, 80) }

  const { data, error: userError } = await ready.supabase.auth.getUser()
  if (userError || !data.user) redirect("/login?next=/account")

  const { data: updated, error } = await ready.supabase
    .from("profiles")
    .update({ display_name: parsed.value })
    .eq("id", data.user.id)
    .select("id")
  if (error || !updated?.length) return { error: "We couldn’t save that name.", displayName: parsed.value }
  revalidatePath("/account")
  return { message: "Saved.", displayName: parsed.value }
}
