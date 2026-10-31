import { Dumbbell } from 'lucide-react'

export function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Dumbbell aria-hidden="true" className="size-5" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-wide text-text-primary">
            KAIF&apos;S GYM
          </span>
          <span className="mt-0.5 block text-xs text-text-muted">ADMIN WORKSPACE</span>
        </span>
      )}
    </div>
  )
}
