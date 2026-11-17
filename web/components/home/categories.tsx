import Image from "next/image"
import Link from "next/link"

const groups = [
  {
    href: "/search?category=storage",
    title: "Summer & break storage",
    blurb: "A closet, cage, or basement corner for boxes, luggage, and the things between leases.",
    image: "/images/storage-boxes.jpg",
    imageAlt: "Stored boxes and shelves, used as a sample photo",
  },
  {
    href: "/search?category=monthly-parking",
    title: "Parking near Yale",
    blurb: "A driveway or covered spot for a car you are allowed to park, on a sample calendar.",
    image: "/images/evening-driveway.jpg",
    imageAlt: "A car under a carport, used as a sample photo",
  },
] as const

export function CategorySection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24" aria-labelledby="categories-title">
      <div className="max-w-xl">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">What you need</p>
        <h2 id="categories-title" className="mt-2 text-4xl tracking-tight md:text-5xl">
          Storage first. Parking when you need the car nearby.
        </h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {groups.map((category) => (
          <Link key={category.href} href={category.href} className="group overflow-hidden rounded-md border border-border bg-card">
            <div className="relative aspect-[16/10]">
              <Image
                src={category.image}
                alt={category.imageAlt}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
              />
            </div>
            <div className="border-t border-border px-4 py-4">
              <h3 className="text-2xl tracking-tight group-hover:underline group-hover:decoration-border group-hover:underline-offset-4">
                {category.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{category.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
