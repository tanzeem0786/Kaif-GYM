import { Badge } from '../common/Badge.jsx'

const variants = {
  active: 'success',
  inactive: 'warning',
}

const labels = {
  active: 'Active',
  inactive: 'Inactive',
}

export function MemberStatusBadge({ status }) {
  return <Badge variant={variants[status] ?? 'neutral'}>{labels[status] ?? status}</Badge>
}
