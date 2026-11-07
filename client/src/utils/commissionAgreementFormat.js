export function getCommissionBasisLabel(basis) {
  return basis === 'membership_fee' ? 'Membership Fee' : 'Received Payment'
}

export function formatAgreementDate(value) {
  if (!value) return 'No end date recorded'
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}
