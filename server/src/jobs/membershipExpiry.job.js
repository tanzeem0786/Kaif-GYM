export function createMembershipExpiryJob({
  expireMemberships,
  intervalMs = 60_000,
  logger = console,
}) {
  let timer
  let running

  async function run() {
    if (running) {
      return running
    }

    running = expireMemberships()
      .catch((error) => {
        logger.error(
          JSON.stringify({
            level: 'error',
            message: 'Membership expiry synchronization failed',
            errorName: error.name,
          }),
        )
      })
      .finally(() => {
        running = undefined
      })
    return running
  }

  return {
    start() {
      if (timer) {
        return
      }
      void run()
      timer = setInterval(() => void run(), intervalMs)
      timer.unref()
    },
    stop() {
      if (timer) {
        clearInterval(timer)
        timer = undefined
      }
    },
  }
}
