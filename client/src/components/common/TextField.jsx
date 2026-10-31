import { forwardRef } from 'react'

export const TextField = forwardRef(function TextField(
  { label, id, error, hint, className = '', ...props },
  ref,
) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text-primary" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        className={`min-h-12 w-full rounded-xl border ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border'} bg-bg px-4 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30 ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-danger" id={descriptionId}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-xs text-text-muted" id={descriptionId}>
          {hint}
        </p>
      )}
    </div>
  )
})
