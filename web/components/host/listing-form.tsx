"use client"

import type { ReactNode } from "react"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { createListingAction, saveListingAction, type HostFormState } from "@/lib/host/actions"
import type { CollegeOption, HostListing, StateOption } from "@/lib/host/types"
import { categories, priceUnits } from "@/lib/catalog"

const blank: HostFormState = {}

export function ListingForm({
  listing,
  colleges,
  states,
}: {
  listing?: HostListing
  colleges: CollegeOption[]
  states: StateOption[]
}) {
  const action = listing ? saveListingAction : createListingAction
  const [state, formAction, pending] = useActionState(action, blank)
  const defaultCollege =
    listing?.collegeId || colleges.find((college) => college.slug === "university-of-michigan-ann-arbor")?.id || ""
  const value = (field: keyof HostListing, fallback = "") => (listing ? String(listing[field] ?? "") : fallback)

  return (
    <form action={formAction} key={`${listing?.updatedAt ?? "new"}-${state.message ?? ""}`} className="space-y-8">
      {listing ? <input type="hidden" name="listing_id" value={listing.id} /> : null}
      <Section
        title="The space"
        lede="A draft can be just a title. Publishing asks for the rest."
      >
        <Field label="Title" name="title" error={state.fieldErrors?.title} defaultValue={value("title")} required />
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Category</span>
          <select name="category" defaultValue={value("category", "monthly-parking")} className="field">
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Space type"
          name="space_type"
          hint="Driveway, garage, carport, lawn, or your own words."
          error={state.fieldErrors?.spaceType}
          defaultValue={value("spaceType")}
        />
        <Field
          label="Summary"
          name="summary"
          error={state.fieldErrors?.summary}
          defaultValue={value("summary")}
        />
        <TextArea
          label="Description"
          name="description"
          error={state.fieldErrors?.description}
          defaultValue={value("description")}
        />
        <Field label="What fits" name="capacity_label" error={state.fieldErrors?.capacityLabel} defaultValue={value("capacityLabel")} />
        <TextArea label="Amenities" name="amenities" defaultValue={value("amenities")} />
        <TextArea label="Restrictions" name="restrictions" hint="House rules a renter should know. Not a gate code." defaultValue={value("restrictions")} />
      </Section>

      <Section title="Where it is" lede="The street address and access notes stay on your account. The public page shows the neighborhood and city.">
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">College market</span>
          <select name="college_id" defaultValue={defaultCollege} className="field">
            <option value="">Not chosen yet</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {college.name} · {college.city}
              </option>
            ))}
          </select>
          {state.fieldErrors?.collegeId ? <FieldError>{state.fieldErrors.collegeId}</FieldError> : (
            <span className="block text-xs leading-5 text-muted-foreground">
              University of Michigan–Ann Arbor is the open market. Other colleges can be added later without a new form.
            </span>
          )}
        </label>
        <Field label="Neighborhood or area" name="neighborhood" error={state.fieldErrors?.neighborhood} defaultValue={value("neighborhood")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="city" error={state.fieldErrors?.city} defaultValue={value("city", "Ann Arbor")} />
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">State</span>
            <select name="state_code" defaultValue={value("stateCode", "MI")} className="field">
              <option value="">Choose</option>
              {states.map((stateOption) => (
                <option key={stateOption.code} value={stateOption.code}>
                  {stateOption.name}
                </option>
              ))}
            </select>
            {state.fieldErrors?.stateCode ? <FieldError>{state.fieldErrors.stateCode}</FieldError> : null}
          </label>
        </div>
        <Field
          label="Street address"
          name="address_line"
          hint="Private until a booking exists. It is not shown on the public listing."
          error={state.fieldErrors?.addressLine}
          defaultValue={value("addressLine")}
        />
        <TextArea
          label="Access notes"
          name="access_notes"
          hint="Gate codes and private instructions stay off the public page."
          defaultValue={value("accessNotes")}
        />
      </Section>

      <Section title="Price and dates" lede="Blocked days are separate. This is the overall window you are willing to offer.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price" name="price" hint="Dollars, such as 145 or 12.50." error={state.fieldErrors?.price} defaultValue={value("price")} inputMode="decimal" />
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Per</span>
            <select name="price_unit" defaultValue={value("priceUnit", "month")} className="field">
              {priceUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Available from" name="available_from" type="date" error={state.fieldErrors?.availableFrom} defaultValue={value("availableFrom")} />
          <Field label="Available until" name="available_until" type="date" defaultValue={value("availableUntil")} />
        </div>
        <Field label="Public host label" name="host_label" hint="A first name is enough. This is not your email." defaultValue={value("hostLabel", "Host")} />
      </Section>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-primary">
          {state.message}
        </p>
      ) : null}
      {state.fieldErrors?.photos ? <FieldError>{state.fieldErrors.photos}</FieldError> : null}
      <Button type="submit" disabled={pending} className="h-12 rounded-md px-5 text-[15px]">
        {pending ? "Saving…" : listing ? "Save draft" : "Save and continue"}
      </Button>
    </form>
  )
}

function Section({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 className="text-2xl tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{lede}</p>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  name,
  hint,
  error,
  defaultValue,
  type = "text",
  required = false,
  inputMode,
}: {
  label: string
  name: string
  hint?: string
  error?: string
  defaultValue?: string
  type?: string
  required?: boolean
  inputMode?: "decimal"
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        inputMode={inputMode}
        className="field"
      />
      {error ? <FieldError>{error}</FieldError> : hint ? <span className="block text-xs leading-5 text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

function TextArea({
  label,
  name,
  hint,
  error,
  defaultValue,
}: {
  label: string
  name: string
  hint?: string
  error?: string
  defaultValue?: string
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <textarea name={name} defaultValue={defaultValue} rows={4} className="field min-h-28" />
      {error ? <FieldError>{error}</FieldError> : hint ? <span className="block text-xs leading-5 text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

function FieldError({ children }: { children: ReactNode }) {
  return <span className="block text-xs leading-5 text-destructive">{children}</span>
}
