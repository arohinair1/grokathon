"use client"

import { useState } from "react"

export function PasswordField({
  name = "password",
  label,
  autoComplete,
  describedBy,
}: {
  name?: string
  label: string
  autoComplete: "current-password" | "new-password"
  describedBy?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          name={name}
          required
          minLength={8}
          maxLength={72}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          className="field pr-16"
        />
        <button
          type="button"
          className="absolute top-1/2 right-1 flex h-11 -translate-y-1/2 items-center rounded-sm px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  )
}
