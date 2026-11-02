import { Badge } from '../common/Badge.jsx'

export function TrainerStatusBadge({ status }) {
  return (
    <Badge variant={status === 'active' ? 'success' : 'warning'}>
      {status === 'active' ? 'Active' : 'Inactive'}
    </Badge>
  )
}
