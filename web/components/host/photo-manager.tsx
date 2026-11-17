"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import {
  coverPhotoAction,
  deletePhotoAction,
  movePhotoAction,
  uploadPhotoAction,
  type HostFormState,
} from "@/lib/host/actions"
import { photoPreviewSrc, type HostPhoto } from "@/lib/host/types"

const blank: HostFormState = {}

export function PhotoManager({ listingId, photos }: { listingId: string; photos: HostPhoto[] }) {
  const [state, action, pending] = useActionState(uploadPhotoAction, blank)
  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 className="text-2xl tracking-tight">Photos</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Add up to eight JPEG, PNG, or WebP photos, 5 MB each. The cover is the public thumbnail.
        </p>
      </div>
      <ul className="space-y-3">
        {photos.map((photo, index) => (
          <li key={photo.id} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row">
            {/* Host photos are served by an authenticated route, so the optimizer is skipped. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreviewSrc(photo)}
              alt={photo.alt}
              className="h-28 w-full rounded-md object-cover sm:w-40"
            />
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {photo.isPrimary ? <span className="text-xs tracking-[0.14em] text-primary uppercase">Cover</span> : null}
              <form action={coverPhotoAction}>
                <input type="hidden" name="listing_id" value={listingId} />
                <input type="hidden" name="photo_id" value={photo.id} />
                <button type="submit" className="text-sm underline-offset-4 hover:underline">
                  Make cover
                </button>
              </form>
              <form action={movePhotoAction}>
                <input type="hidden" name="listing_id" value={listingId} />
                <input type="hidden" name="photo_id" value={photo.id} />
                <input type="hidden" name="direction" value="up" />
                <button type="submit" disabled={index === 0} className="text-sm underline-offset-4 hover:underline disabled:opacity-40">
                  Move up
                </button>
              </form>
              <form action={movePhotoAction}>
                <input type="hidden" name="listing_id" value={listingId} />
                <input type="hidden" name="photo_id" value={photo.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  type="submit"
                  disabled={index === photos.length - 1}
                  className="text-sm underline-offset-4 hover:underline disabled:opacity-40"
                >
                  Move down
                </button>
              </form>
              <form action={deletePhotoAction}>
                <input type="hidden" name="listing_id" value={listingId} />
                <input type="hidden" name="photo_id" value={photo.id} />
                <button type="submit" className="text-sm text-destructive underline-offset-4 hover:underline">
                  Remove
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      <form action={action} className="space-y-3">
        <input type="hidden" name="listing_id" value={listingId} />
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Photo file</span>
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="block w-full text-sm" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Alt text</span>
          <input name="alt" type="text" maxLength={140} className="field" placeholder="Driveway seen from the street" />
        </label>
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
        <Button type="submit" disabled={pending} className="h-11 rounded-md px-4">
          {pending ? "Uploading…" : "Add photo"}
        </Button>
      </form>
    </section>
  )
}
