import { EmptyState } from "@/components/states"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20 md:px-8">
      <EmptyState
        title="That page isn’t here."
        body="The address doesn’t match a page in this preview. The demo catalog is still on the homepage and in search."
        actionHref="/"
        actionLabel="Back to the homepage"
      />
    </div>
  )
}
