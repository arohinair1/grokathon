import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string
  body: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center">
      <h2 className="text-3xl tracking-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        {body}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className={cn(buttonVariants({ variant: "outline" }), "mt-6 h-10 rounded-md px-4")}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

export function LoadingState({ label = "Loading spaces" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {["one", "two", "three"].map((key) => (
          <div key={key} className="space-y-3">
            <div className="aspect-[4/3] animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded-sm bg-muted" />
            <div className="h-6 w-3/4 animate-pulse rounded-sm bg-muted" />
            <div className="h-4 w-full animate-pulse rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CatalogUnavailableState({ href }: { href: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center"
    >
      <meta name="robots" content="noindex" />
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Demo catalog</p>
      <h2 className="mt-3 text-3xl tracking-tight">The demo catalog can’t be reached.</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        The database did not answer in time. Nothing was held or charged. This
        page is not showing the checked-in sample list in its place.
      </p>
      <Link
        href={href}
        className={cn(buttonVariants({ variant: "outline" }), "mt-6 h-10 rounded-md px-4")}
      >
        Try again
      </Link>
    </div>
  )
}

export function ErrorState({
  onRetry,
}: {
  onRetry?: () => void
}) {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center" role="alert">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
        College Space
      </p>
      <h1 className="mt-3 text-4xl tracking-tight">This page didn’t load.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        The preview hit an unexpected error. Your place in the demo catalog is
        unchanged, because nothing here is saved yet.
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn(buttonVariants(), "mt-6 h-11 rounded-md px-5")}
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
