import Link from "next/link"

export function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-2.5 text-foreground">
      <svg
        viewBox="0 0 28 28"
        aria-hidden="true"
        className="size-7 text-primary"
      >
        <rect
          x="2.25"
          y="2.25"
          width="23.5"
          height="23.5"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path d="M2.25 17.5h9.5" stroke="currentColor" strokeWidth="1.75" />
      </svg>
      <span className="font-display text-[1.15rem] leading-none tracking-[-0.03em]">
        College Space
      </span>
    </Link>
  )
}
