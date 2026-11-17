import type { ReactNode } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ProfileForm } from "@/components/auth/auth-forms"
import { ACCOUNTS_UNAVAILABLE } from "@/lib/auth-copy"
import { accountsConfigured } from "@/lib/supabase/auth-client"
import { createServerAuthClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
}

function memberSince(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const params = await searchParams
  if (!accountsConfigured()) {
    return (
      <AccountShell>
        <p role="alert">{ACCOUNTS_UNAVAILABLE}</p>
      </AccountShell>
    )
  }
  const supabase = await createServerAuthClient()
  if (!supabase) {
    return (
      <AccountShell>
        <p role="alert">{ACCOUNTS_UNAVAILABLE}</p>
      </AccountShell>
    )
  }
  let user: { id: string; email?: string } | null = null
  try {
    const userResult = await supabase.auth.getUser()
    user = userResult.data.user
  } catch {
    user = null
  }
  if (!user) redirect("/login?next=/account")

  const profile = await supabase
    .from("profiles")
    .select("display_name, created_at")
    .eq("id", user.id)
    .maybeSingle()

  return (
    <AccountShell>
      {params.password === "updated" ? (
        <p role="status" className="text-sm text-primary">
          Your password is updated.
        </p>
      ) : null}
      {profile.error || !profile.data ? (
        <p role="alert" className="text-sm">
          We couldn’t load your profile. Nothing was created from this page.
        </p>
      ) : (
        <div className="space-y-6">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="mt-1">{memberSince(profile.data.created_at)}</dd>
            </div>
          </dl>
          <ProfileForm displayName={profile.data.display_name} />
        </div>
      )}
    </AccountShell>
  )
}

function AccountShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl px-5 py-14 md:py-20">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">Account</p>
      <h1 className="mt-3 text-4xl leading-tight">Your account</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        This is the person behind the login. Listing tools are on{" "}
        <Link href="/host" className="underline-offset-4 hover:underline">
          Your listings
        </Link>
        . Date requests are on{" "}
        <Link href="/bookings" className="underline-offset-4 hover:underline">
          Your requests
        </Link>
        . Nothing here collects payment.
      </p>
      <div className="mt-8 rounded-md border border-border bg-card p-5 sm:p-6">{children}</div>
      <form action="/auth/sign-out" method="post" className="mt-6">
        <button
          type="submit"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
