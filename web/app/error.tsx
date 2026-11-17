"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/states"

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    document.title = "This page didn’t load · College Space"
    console.error(error)
  }, [error])

  return <ErrorState onRetry={retry} />
}
