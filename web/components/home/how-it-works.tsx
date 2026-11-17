const steps = [
  {
    number: "01",
    title: "Describe the move.",
    body: "Tell Grok what you are storing or parking, the dates, the neighborhood, and a budget. You can correct the space estimate.",
  },
  {
    number: "02",
    title: "See spaces that already exist.",
    body: "College Space filters the Yale sample catalog. Grok can explain a match. It cannot invent a listing or change the dates on the card.",
  },
  {
    number: "03",
    title: "Send a simulated request.",
    body: "On a sample listing, a request stays in this browser. It does not reach a host, hold the space, or collect payment.",
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 md:px-8 md:py-24" aria-labelledby="how-title">
      <h2 id="how-title" className="max-w-lg text-4xl tracking-tight md:text-5xl">
        How SpaceMatch works
      </h2>
      <ol className="mt-12 grid gap-10 md:grid-cols-3">
        {steps.map((step) => (
          <li key={step.number}>
            <p className="font-display text-3xl text-primary">{step.number}</p>
            <h3 className="mt-3 text-2xl tracking-tight">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
