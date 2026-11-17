import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { BookingList } from "@/components/booking-list"
import { SampleInbox } from "@/components/yale/sample-inbox"
import { loadBookings } from "@/lib/bookings/load"

export const metadata: Metadata = {
  title: "My bookings",
  robots: { index: false, follow: false },
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const params = await searchParams
  const simulated = params.simulated === "1"
  const loaded = await loadBookings("renter")

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14 md:px-8 md:py-20">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">Sample requests</p>
      <h1 className="mt-3 text-4xl leading-tight md:text-5xl">My bookings</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        Requests on the Yale sample catalog are simulated in this browser. Accepting one does not reserve a space and does not collect payment.{" "}
        <Link href="/find" className="underline-offset-4 hover:underline">
          Find a space
        </Link>
        .
      </p>
      {simulated ? (
        <p role="status" className="mt-6 text-sm text-primary">
          Simulated request saved in this browser. It was not sent to a host.
        </p>
      ) : null}
      <SampleInbox />
      {loaded.ok && loaded.rows.length > 0 ? (
        <div className="mt-14">
          <h2 className="text-2xl tracking-tight">Account requests</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            These came from a signed-in account on the connected database. They are separate from the simulated Yale demo.
          </p>
          <BookingList rows={loaded.rows} mode="renter" />
        </div>
      ) : null}
    </div>
  )
}
