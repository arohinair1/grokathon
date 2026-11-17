import type { ReactNode } from "react"
import Link from "next/link"
import { ACCOUNTS_UNAVAILABLE } from "@/lib/auth-copy"
import { accountsConfigured } from "@/lib/supabase/auth-client"

export function AuthFrame({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string
  title: string
  lede: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-14 md:py-20">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">{eyebrow}</p>
      <h1 className="mt-3 text-4xl leading-tight">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{lede}</p>
      <div className="mt-8 rounded-md border border-border bg-card p-5 sm:p-6">
        {accountsConfigured() ? (
          children
        ) : (
          <div className="space-y-4">
            <p role="alert" className="text-sm leading-6">
              {ACCOUNTS_UNAVAILABLE}
            </p>
            <Link href="/search" className="text-sm text-primary underline-offset-4 hover:underline">
              Browse demo spaces
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
