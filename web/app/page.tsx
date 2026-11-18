import Image from "next/image"
import Link from "next/link"
import { CategorySection } from "@/components/home/categories"
import { FeaturedListings } from "@/components/home/featured"
import { HostBand } from "@/components/home/host-band"
import { HowItWorks } from "@/components/home/how-it-works"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function HomePage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
          <div className="relative z-10 px-5 py-12 md:px-8 md:py-16 lg:py-20">
            <p className="text-xs tracking-[0.18em] text-primary uppercase">Yale · New Haven</p>
            <h1 className="mt-4 max-w-xl text-[2.6rem] leading-[1.05] tracking-[-0.035em] md:text-6xl">
              A little more space for life at Yale.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
              Find affordable storage and parking around Yale. Tell Grok what you need, and we&apos;ll help you find the right fit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/find" className={cn(buttonVariants(), "h-12 rounded-md px-5 text-[15px]")}>
                Find my space with Grok
              </Link>
              <Link
                href="/search?category=storage"
                className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-md px-5 text-[15px]")}
              >
                Browse summer storage
              </Link>
              <Link
                href="/search?category=monthly-parking"
                className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-md px-5 text-[15px]")}
              >
                Browse parking
              </Link>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              Summer storage and off-street parking are both part of this demo. Parking includes a driveway for a weekend visit, move-in, or graduation. Sample listings are fictional, prices are illustrative, and this preview does not take payment.
            </p>
          </div>
          <div className="relative min-h-72 overflow-hidden lg:min-h-full">
            <Image
              src="/images/hero-street.jpg"
              alt="A residential street used as a sample photograph, not a New Haven address"
              fill
              priority
              sizes="(min-width: 1024px) 46vw, 100vw"
              className="object-cover"
            />
            <p className="absolute inset-x-0 bottom-0 bg-foreground/95 px-4 py-3 text-sm text-background">
              Sample photograph. Not a Yale address, and not a listed space. College Space is not a Yale University service.
            </p>
          </div>
        </div>
      </section>
      <CategorySection />
      <FeaturedListings />
      <HowItWorks />
      <HostBand />
    </>
  )
}
