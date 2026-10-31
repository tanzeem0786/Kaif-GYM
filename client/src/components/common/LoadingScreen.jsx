import { LoaderCircle } from 'lucide-react'

export function LoadingScreen({ label = 'Loading' }) {
  return (
    <main
      aria-live="polite"
      className="flex min-h-screen items-center justify-center gap-3 bg-bg px-6 text-sm text-text-secondary"
    >
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-text-primary" />
      <span>{label}</span>
    </main>
  )
}
