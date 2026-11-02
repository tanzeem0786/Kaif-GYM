export function parseRupeesToPaise(value) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!match) {
    return null
  }
  const paise = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0') || '0')
  if (paise > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null
  }
  return Number(paise)
}

export function formatRupeesFromPaise(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100)
}

export function formatMembershipDate(value, options = {}) {
  if (!value) {
    return 'Not provided'
  }
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(value))
}

export function getUtcDateInputValue(value = new Date()) {
  return value.toISOString().slice(0, 10)
}
