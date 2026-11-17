import Image from "next/image"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function HostBand() {
  return (
    <section id="list-your-space" className="scroll-mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-16 md:grid-cols-2 md:px-8 md:py-24">
        <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-muted sm:aspect-[5/4] md:aspect-[4/5]">
          <Image
            src="/images/side-yard.jpg"
            alt="An indoor stair used as a sample photograph, not a listed apartment"
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">For students with space</p>
          <h2 className="mt-2 text-4xl tracking-tight md:text-5xl">
            If you can offer a closet or a parking spot, start with a sentence.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Grok can turn a description into a draft title, capacity note, and availability. You review every line before it is kept. The draft stays in this browser. It is not published, and it does not create a rental.
          </p>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Offer only space you are allowed to rent. This demo does not include dorm rooms or university buildings.
          </p>
          <Link href="/list" className={cn(buttonVariants(), "mt-6 h-11 rounded-md px-4")}>
            List your space
          </Link>
        </div>
      </div>
    </section>
  )
}
