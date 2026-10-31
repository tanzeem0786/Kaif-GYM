export function Card({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-border bg-surface ${className}`}>
      {children}
    </section>
  )
}
