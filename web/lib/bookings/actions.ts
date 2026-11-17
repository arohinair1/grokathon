"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { bookingErrorMessage, inclusiveDays, MAX_INCLUSIVE_DAYS, todayInAnnArbor } from "@/lib/bookings/pricing"
import { isRealDate } from "@/lib/host/validation"
import { createServerAuthClient } from "@/lib/supabase/server"

export type BookingFormState = {
  error?: string
  message?: string
}

const UNAVAILABLE = "Booking requests aren’t available until the database update is applied."

type BookingClient = NonNullable<Awaited<ReturnType<typeof createServerAuthClient>>>

function schemaMissing(error: { code?: string; message?: string } | null): boolean {
  const message = error?.message ?? ""
  return (
    error?.code === "42P01" ||
    error?.code === "42883" ||
    error?.code === "PGRST202" ||
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    message.includes("Could not find the function")
  )
}

function fromDatabase(error: { code?: string; message?: string } | null): string {
  if (schemaMissing(error)) return UNAVAILABLE
  return bookingErrorMessage(`${error?.message ?? ""}`)
}

async function clientOrRedirect(nextPath: string): Promise<BookingClient> {
  const supabase = await createServerAuthClient()
  if (!supabase) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  return supabase
}

export async function requestBookingAction(
  _state: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const slug = String(formData.get("listing_slug") ?? "")
  const nextPath = slug ? `/listings/${slug}` : "/search"
  const supabase = await clientOrRedirect(nextPath)
  const startsOn = String(formData.get("starts_on") ?? "")
  const endsOn = String(formData.get("ends_on") ?? "")
  if (!isRealDate(startsOn) || !isRealDate(endsOn) || endsOn < startsOn) {
    return { error: "Use a real start and end. The end date can be the same day." }
  }
  const days = inclusiveDays(startsOn, endsOn)
  if (days == null || days > MAX_INCLUSIVE_DAYS) {
    return { error: "Request 366 days or fewer." }
  }
  if (startsOn < todayInAnnArbor()) {
    return { error: "The start date has already passed in Ann Arbor." }
  }

  const listing = await supabase
    .from("listings")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle()
  if (schemaMissing(listing.error)) return { error: UNAVAILABLE }
  if (listing.error || !listing.data) return { error: "This listing isn’t open for requests." }

  const created = await supabase.rpc("request_booking", {
    p_listing_id: listing.data.id,
    p_starts_on: startsOn,
    p_ends_on: endsOn,
  })
  if (created.error || typeof created.data !== "string") {
    return { error: fromDatabase(created.error) }
  }
  revalidatePath("/bookings")
  revalidatePath(`/listings/${slug}`)
  redirect(`/bookings?requested=${created.data}`)
}

async function transition(
  formData: FormData,
  fn: "accept_booking" | "decline_booking" | "cancel_booking",
  returnPath: string,
): Promise<BookingFormState> {
  const supabase = await clientOrRedirect(returnPath)
  const requestId = String(formData.get("request_id") ?? "")
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { error: "That request was not found." }
  const result = await supabase.rpc(fn, { p_request_id: requestId })
  if (result.error) return { error: fromDatabase(result.error) }
  revalidatePath("/bookings")
  revalidatePath("/host/requests")
  revalidatePath("/host")
  return { message: fn === "accept_booking" ? "Request accepted." : fn === "decline_booking" ? "Request declined." : "Request cancelled." }
}

export async function acceptBookingAction(_state: BookingFormState, formData: FormData): Promise<BookingFormState> {
  return transition(formData, "accept_booking", "/host/requests")
}

export async function declineBookingAction(_state: BookingFormState, formData: FormData): Promise<BookingFormState> {
  return transition(formData, "decline_booking", "/host/requests")
}

export async function cancelBookingAction(_state: BookingFormState, formData: FormData): Promise<BookingFormState> {
  return transition(formData, "cancel_booking", "/bookings")
}
