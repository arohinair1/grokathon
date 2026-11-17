import { SpaceMatchFinder } from "@/components/spacematch/finder"

export const metadata = {
  title: "Find my space",
  description: "Describe storage or parking around Yale. Grok reads the request, and College Space matches it to the sample catalog.",
}

export default function FindPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">SpaceMatch</p>
      <h1 className="mt-3 max-w-3xl text-4xl tracking-tight md:text-6xl">Find a space around Yale.</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        Describe the summer, the boxes, the dates, and a budget. Grok turns that into requirements. College Space checks the sample catalog and keeps the explanation tied to those listings.
      </p>
      <div className="mt-8">
        <SpaceMatchFinder />
      </div>
    </div>
  )
}
