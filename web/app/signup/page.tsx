import type { Metadata } from "next"
import { AuthFrame } from "@/components/auth/auth-frame"
import { SignupForm } from "@/components/auth/auth-forms"

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  return (
    <AuthFrame
      eyebrow="Account"
      title="Create an account"
      lede="One account can later rent a space or list one. This step asks for an email and a password."
    >
      <SignupForm />
    </AuthFrame>
  )
}
