import { Badge } from '../common/Badge.jsx'

export function PaymentStatusBadge({ status }) {
  return (
    <Badge variant={status === 'completed' ? 'success' : 'warning'}>
      {status === 'completed' ? 'Completed' : 'Fully reversed'}
    </Badge>
  )
}
