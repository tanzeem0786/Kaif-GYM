import logo from '../../assets/logo.png'

export function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <img alt="Barbell Arena" className="size-15 shrink-0 rounded-xl object-cover" src={logo} />
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-wide text-text-primary">
            BARBELL ARENA
          </span>
          <span className="mt-0.5 block text-xs text-text-muted">ADMIN WORKSPACE</span>
        </span>
      )}
    </div>
  )
}
