import Link from "next/link"
import { Wordmark } from "@/components/wordmark"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div className="space-y-4">
          <Wordmark />
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Storage and parking for life around Yale. Sample cards are fictional. Nothing here is a reservation, and nothing is charged. College Space is not endorsed by Yale University.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-medium text-foreground">Around Yale</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link href="/find" className="hover:text-foreground">
                Find space with Grok
              </Link>
            </li>
            <li>
              <Link href="/search?category=storage" className="hover:text-foreground">
                Summer storage
              </Link>
            </li>
            <li>
              <Link href="/search?category=monthly-parking" className="hover:text-foreground">
                Parking
              </Link>
            </li>
            <li>
              <Link href="/#how" className="hover:text-foreground">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/list" className="hover:text-foreground">
                List your space
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-medium text-foreground">This demo</p>
          <p className="leading-6 text-muted-foreground">
            The public catalog is a Yale sample market in New Haven. Listings, hosts, and prices are illustrative. A simulated booking stays in your browser. Photographs are not pictures of listed spaces.
          </p>
        </div>
      </div>
    </footer>
  )
}
