import type { Metadata } from "next"
import { AuthFrame } from "@/components/auth/auth-frame"
import { LoginForm } from "@/components/auth/auth-forms"
import { safeNextPath } from "@/lib/safe-next"

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const nextValue = typeof params.next === "string" ? params.next : ""
  return (
    <AuthFrame
      eyebrow="Account"
      title="Log in"
      lede="Use the email and password for your College Space account. Browsing the demo catalog does not require one."
    >
      <LoginForm next={safeNextPath(nextValue)} linkError={params.error === "link"} />
    </AuthFrame>
  )
}
