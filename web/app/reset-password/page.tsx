import type { Metadata } from "next"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { AuthFrame } from "@/components/auth/auth-frame"
import { ResetPasswordForm } from "@/components/auth/auth-forms"
import { hasRecoveryContext, RECOVERY_COOKIE } from "@/lib/auth/recovery"
import { accountsConfigured } from "@/lib/supabase/auth-client"
import { createServerAuthClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
}

export default async function ResetPasswordPage() {
  await connection()
  if (!accountsConfigured()) {
    return (
      <AuthFrame
        eyebrow="Account"
        title="Choose a new password"
        lede="Password links return here."
      >
        <span />
      </AuthFrame>
    )
  }
  const supabase = await createServerAuthClient()
  let userId: string | null = null
  try {
    const user = supabase ? await supabase.auth.getUser() : { data: { user: null } }
    userId = user.data.user?.id ?? null
  } catch {
    userId = null
  }
  const cookieStore = await cookies()
  if (!userId || !hasRecoveryContext(cookieStore.get(RECOVERY_COOKIE)?.value)) {
    redirect("/forgot-password")
  }
  return (
    <AuthFrame
      eyebrow="Account"
      title="Choose a new password"
      lede="This replaces the password on your account and signs out other sessions."
    >
      <ResetPasswordForm />
    </AuthFrame>
  )
}
