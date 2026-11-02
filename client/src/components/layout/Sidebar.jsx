import {
  Bell,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  Percent,
  ScrollText,
  Settings,
  UsersRound,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Brand } from './Brand.jsx'

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Members', icon: UsersRound, path: '/members' },
  { label: 'Memberships', icon: Dumbbell, path: '/memberships' },
  { label: 'Membership Plans', icon: ClipboardList, path: '/membership-plans' },
  { label: 'Trainers', icon: UsersRound, path: '/trainers' },
  { label: 'Payments', icon: CreditCard, milestone: 'M7' },
  { label: 'Commissions', icon: Percent, milestone: 'M8' },
  { label: 'Reports', icon: ChartNoAxesCombined, milestone: 'Later' },
  { label: 'Notifications', icon: Bell, milestone: 'Later' },
  { label: 'Settings', icon: Settings, milestone: 'Later' },
  { label: 'Audit Logs', icon: ScrollText, milestone: 'Later' },
]

export function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-sidebar px-4 py-5">
      <div className="px-2">
        <Brand />
      </div>

      <p className="mb-3 mt-10 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
        Workspace
      </p>
      <nav aria-label="Main navigation" className="space-y-1">
        {navigation.map(({ label, icon: Icon, path, milestone }) =>
          path ? (
            <NavLink
              key={label}
              to={path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-hover text-text-primary'
                    : 'text-text-secondary hover:bg-hover hover:text-text-primary'
                }`
              }
            >
              <Icon aria-hidden="true" className="size-[18px]" />
              <span>{label}</span>
            </NavLink>
          ) : (
            <button
              key={label}
              type="button"
              disabled
              title={`${label} will be available in ${milestone}`}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-text-muted opacity-80"
            >
              <Icon aria-hidden="true" className="size-[18px]" />
              <span className="flex-1">{label}</span>
              <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] tracking-wide">
                SOON
              </span>
            </button>
          ),
        )}
      </nav>

      <div className="mt-auto rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-text-primary">More to come</p>
        <p className="mt-1.5 text-xs leading-5 text-text-muted">
          New management tools will appear here as future milestones are completed.
        </p>
      </div>
      <p className="px-2 pt-5 text-xs text-text-muted">Kaif&apos;s GYM · Admin</p>
    </div>
  )
}
