import { HostDrafter } from "@/components/yale/host-drafter"

export const metadata = {
  title: "List your space",
  description: "Draft a Yale-area storage or parking listing with Grok. Nothing is published until you approve it, and this demo does not publish at all.",
}

export default function ListPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-14">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">Hosts</p>
      <h1 className="mt-3 text-4xl tracking-tight md:text-5xl">Describe a space you can offer.</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Grok suggests a title, category, and availability from your own words. Dimensions, access rules, and amenities are left blank when you did not state them. Approving a draft stores it in this browser only.
      </p>
      <div className="mt-8">
        <HostDrafter />
      </div>
    </div>
  )
}
