import { Badge } from '../common/Badge.jsx'

const variants = {
  active: 'success',
  inactive: 'warning',
  archived: 'neutral',
}

const labels = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
}

export function MemberStatusBadge({ status }) {
  return <Badge variant={variants[status] ?? 'neutral'}>{labels[status] ?? status}</Badge>
}
