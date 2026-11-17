"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PasswordField } from "@/components/auth/password-field"
import {
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
  signupAction,
  updateProfileAction,
} from "@/lib/auth/actions"
import { blankAuthState, shownDisplayName, type AuthFormState } from "@/lib/auth-copy"

function Feedback({ state }: { state: AuthFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    )
  }
  if (!state.message) return null
  return (
    <p role="status" className="text-sm leading-6 text-foreground">
      {state.message}
    </p>
  )
}

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [state, action, pending] = useActionState(loginAction, blankAuthState())
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {linkError ? (
        <p role="alert" className="text-sm text-destructive">
          That link is invalid or has already been used.
        </p>
      ) : null}
      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Email</span>
        <input type="email" name="email" required autoComplete="email" className="field" />
      </label>
      <PasswordField label="Password" autoComplete="current-password" />
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-md text-[15px]">
        {pending ? "Signing in…" : "Log in"}
      </Button>
      <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <Link href="/forgot-password" className="underline-offset-4 hover:text-foreground hover:underline">
          Forgot password
        </Link>
        <Link href="/signup" className="underline-offset-4 hover:text-foreground hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  )
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, blankAuthState())
  if (state.message) {
    return (
      <div className="space-y-4">
        <Feedback state={state} />
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:text-foreground hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    )
  }
  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Email</span>
        <input type="email" name="email" required autoComplete="email" className="field" />
      </label>
      <PasswordField
        label="Password"
        autoComplete="new-password"
        describedBy="password-hint"
      />
      <p id="password-hint" className="text-xs leading-5 text-muted-foreground">
        At least 8 characters.
      </p>
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-md text-[15px]">
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="underline-offset-4 hover:text-foreground hover:underline">
          Already have an account? Log in
        </Link>
      </p>
    </form>
  )
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, blankAuthState())
  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Email</span>
        <input type="email" name="email" required autoComplete="email" className="field" />
      </label>
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-md text-[15px]">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="underline-offset-4 hover:text-foreground hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  )
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, blankAuthState())
  return (
    <form action={action} className="space-y-4">
      <PasswordField label="New password" autoComplete="new-password" describedBy="password-hint" />
      <p id="password-hint" className="text-xs leading-5 text-muted-foreground">
        At least 8 characters. This signs out other sessions.
      </p>
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-md text-[15px]">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  )
}

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, blankAuthState())
  const shown = shownDisplayName(displayName, state)
  return (
    <form action={action} key={shown} className="space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Display name</span>
        <input
          type="text"
          name="display_name"
          required
          minLength={1}
          maxLength={80}
          defaultValue={shown}
          autoComplete="nickname"
          className="field"
        />
      </label>
      <Feedback state={state} />
      <Button type="submit" disabled={pending} className="h-12 rounded-md px-5 text-[15px]">
        {pending ? "Saving…" : "Save name"}
      </Button>
    </form>
  )
}
