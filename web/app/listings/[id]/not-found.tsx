import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function ListingNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20 md:px-8">
      <div className="rounded-md border border-dashed border-border bg-card px-6 py-14 text-center">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Demo catalog
        </p>
        <h1 className="mt-3 text-3xl tracking-tight">That listing isn’t in the demo catalog.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          The address doesn’t match a sample space. Nothing was held or charged.
        </p>
        <Link
          href="/search"
          className={cn(buttonVariants({ variant: "outline" }), "mt-6 h-10 rounded-md px-4")}
        >
          See demo spaces
        </Link>
      </div>
    </div>
  )
}
