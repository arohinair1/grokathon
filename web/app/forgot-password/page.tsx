import type { Metadata } from "next"
import { AuthFrame } from "@/components/auth/auth-frame"
import { ForgotPasswordForm } from "@/components/auth/auth-forms"

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <AuthFrame
      eyebrow="Account"
      title="Reset your password"
      lede="We’ll send a link if that address can receive one. The link opens on this site and expires after it is used."
    >
      <ForgotPasswordForm />
    </AuthFrame>
  )
}
