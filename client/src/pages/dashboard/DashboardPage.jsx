import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  CreditCard,
  Dumbbell,
} from 'lucide-react'
import { Badge } from '../../components/common/Badge.jsx'
import { Card } from '../../components/common/Card.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { Link } from 'react-router-dom'

const futureModules = [
  { title: 'Memberships', milestone: 'M5', icon: Dumbbell },
  { title: 'Payments', milestone: 'M7', icon: CreditCard },
]

export function DashboardPage() {
  const { admin } = useAuth()
  const firstName = admin?.name?.trim().split(/\s+/)[0] || 'Admin'

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-text-secondary">
            {new Intl.DateTimeFormat(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(new Date())}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome, {firstName}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            Your admin workspace is ready. This overview will grow as the next project milestones
            are delivered.
          </p>
        </div>
        <Badge className="w-fit" variant="success">
          <span className="size-1.5 rounded-full bg-success" />
          Workspace active
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-text-muted">
              Foundation complete
            </p>
            <h3 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
              A clearer view of your gym starts here.
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">
              Sign-in and your private admin dashboard are in place. Management features will
              appear here only when their milestones are ready.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-elevated p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Check aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">Admin access verified</p>
                <p className="mt-1 text-xs text-text-secondary">Your session is active</p>
              </div>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs leading-5 text-text-muted">
                Business data will appear after the corresponding modules are implemented.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <section aria-labelledby="modules-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold" id="modules-heading">
              Coming next
            </h3>
            <p className="mt-1 text-sm text-text-secondary">No business metrics are available yet.</p>
          </div>
          <span className="hidden text-xs text-text-muted sm:inline">Planned milestones</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {futureModules.map(({ title, milestone, icon: Icon }) => (
            <Card className="p-5" key={title}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <Badge>{milestone}</Badge>
              </div>
              <h4 className="mt-5 text-base font-semibold">{title}</h4>
              <p className="mt-1.5 text-sm text-text-muted">Not available until {milestone}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
              <Activity aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Recent activity</h3>
              <p className="mt-1 text-xs text-text-muted">Activity will show here when available.</p>
            </div>
          </div>
          <div className="mt-6 flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 text-center">
            <p className="text-sm text-text-secondary">No activity to display</p>
            <p className="mt-1 text-xs text-text-muted">
              No records have been added to the workspace yet.
            </p>
          </div>
        </Card>

        <Card className="p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
              <CalendarDays aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Project milestones</h3>
              <p className="mt-1 text-xs text-text-muted">Workspace development progress</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-text-secondary">Frontend foundation</span>
            <Badge variant="success">
              Complete <Check aria-hidden="true" className="size-3" />
            </Badge>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Link
              className="inline-flex items-center gap-1 text-sm text-text-primary hover:text-text-secondary"
              to="/members"
            >
              Member management <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </Card>
      </section>
    </div>
  )
}
