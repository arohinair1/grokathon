import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { BookingList } from "@/components/booking-list"
import { loadBookings } from "@/lib/bookings/load"

export const metadata: Metadata = {
  title: "Incoming requests",
  robots: { index: false, follow: false },
}

export default async function HostRequestsPage() {
  await connection()
  const loaded = await loadBookings("host")
  if (!loaded.ok && loaded.reason === "signed-out") redirect("/login?next=/host/requests")

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14 md:px-8 md:py-20">
      <p className="text-xs tracking-[0.18em] text-primary uppercase">Hosting</p>
      <h1 className="mt-3 text-4xl leading-tight md:text-5xl">Incoming requests</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        Accept one request to reserve those dates. A second overlapping request cannot be accepted. Declining leaves the dates open. This does not collect payment.{" "}
        <Link href="/host" className="underline-offset-4 hover:underline">
          Back to your listings
        </Link>
        .
      </p>
      {!loaded.ok ? (
        <p role="alert" className="mt-8 text-sm">
          Booking requests aren’t available until the database update is applied.
        </p>
      ) : (
        <BookingList rows={loaded.rows} mode="host" />
      )}
    </div>
  )
}
