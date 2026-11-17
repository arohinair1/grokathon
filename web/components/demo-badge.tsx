export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border border-demo/30 bg-background px-1.5 py-0.5 text-[10px] font-medium tracking-[0.14em] text-demo uppercase ${className}`}
    >
      Demo
    </span>
  )
}
