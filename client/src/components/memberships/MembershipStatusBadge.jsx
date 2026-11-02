import { Badge } from '../common/Badge.jsx'

const statusVariants = {
  active: 'success',
  expired: 'danger',
  inactive: 'neutral',
  frozen: 'info',
}

export function MembershipStatusBadge({ status }) {
  const label = status ? `${status[0].toUpperCase()}${status.slice(1)}` : 'Unknown'
  return <Badge variant={statusVariants[status] ?? 'neutral'}>{label}</Badge>
}
