import Link from "next/link"
import { Suspense } from "react"
import { cookies } from "next/headers"
import { buttonVariants } from "@/components/ui/button"
import { Wordmark } from "@/components/wordmark"
import { hasAuthSessionCookie } from "@/lib/supabase/auth-client"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        <Wordmark />
        <Suspense fallback={<HeaderNav signedIn={false} />}>
          <AuthNav />
        </Suspense>
      </div>
    </header>
  )
}

async function AuthNav() {
  const cookieStore = await cookies()
  const signedIn = hasAuthSessionCookie(cookieStore.getAll())
  return <HeaderNav signedIn={signedIn} />
}

function HeaderNav({ signedIn }: { signedIn: boolean }) {
  return (
    <>
      <details className="relative sm:hidden">
        <summary className="flex h-11 cursor-pointer list-none items-center rounded-md border border-border px-3 text-sm [&::-webkit-details-marker]:hidden">
          Menu
        </summary>
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-border bg-card p-3 shadow-sm">
          <HeaderLinks signedIn={signedIn} stacked />
        </div>
      </details>
      <nav aria-label="Primary" className="hidden items-center gap-2 sm:flex sm:gap-5">
        <HeaderLinks signedIn={signedIn} />
      </nav>
    </>
  )
}

function HeaderLinks({ signedIn, stacked = false }: { signedIn: boolean; stacked?: boolean }) {
  const item = stacked
    ? "block py-2 text-sm"
    : "text-sm text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
  return (
    <div className={stacked ? "space-y-1" : "flex items-center gap-2 sm:gap-5"}>
      <Link href="/find" className={item}>
        Find Space
      </Link>
      <Link href="/#how" className={item}>
        How It Works
      </Link>
      <Link href="/bookings" className={item}>
        My Bookings
      </Link>
      <Link href={signedIn ? "/account" : "/login?next=/account"} className={item}>
        Account
      </Link>
      {signedIn ? (
        <form action="/auth/sign-out" method="post">
          <button type="submit" className={cn(item, "bg-transparent")}>
            Sign out
          </button>
        </form>
      ) : null}
      <Link
        href="/list"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 rounded-md px-3.5", stacked && "mt-2 w-full")}
      >
        List Your Space
      </Link>
    </div>
  )
}
