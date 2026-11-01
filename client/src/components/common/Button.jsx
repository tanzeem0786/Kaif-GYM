import { LoaderCircle } from 'lucide-react'

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-focus',
  secondary:
    'border border-border bg-surface text-text-primary hover:bg-hover focus-visible:outline-focus',
  ghost: 'text-text-secondary hover:bg-hover hover:text-text-primary focus-visible:outline-focus',
}

export function Button({
  children,
  as: Component = 'button',
  variant = 'primary',
  className = '',
  loading = false,
  disabled = false,
  ...props
}) {
  const isButton = Component === 'button'

  return (
    <Component
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${variants[variant]} ${className}`}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={!isButton && disabled ? true : undefined}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {children}
    </Component>
  )
}
