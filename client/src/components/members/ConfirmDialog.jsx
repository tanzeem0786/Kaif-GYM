import { Button } from '../common/Button.jsx'

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onClick={busy ? undefined : onCancel}
    >
      <section
        aria-labelledby="confirm-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 className="text-lg font-semibold" id="confirm-title">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button disabled={busy} onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button loading={busy} onClick={onConfirm} variant="primary">
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}
