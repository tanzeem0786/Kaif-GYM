export function getHealthStatus(databaseStatus) {
  const healthy = databaseStatus === 'connected'

  return {
    status: healthy ? 'ok' : 'unavailable',
    database: { status: databaseStatus },
  }
}
