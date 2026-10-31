export function createGracefulShutdown({ server, disconnectDatabase, logger = console }) {
  let shutdownPromise

  return function gracefulShutdown(signal) {
    if (shutdownPromise) {
      return shutdownPromise
    }

    shutdownPromise = (async () => {
      logger.info(
        JSON.stringify({ level: 'info', message: 'Graceful shutdown started', signal }),
      )
      const failures = []

      try {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()))
        })
      } catch (error) {
        failures.push(error)
      }

      try {
        await disconnectDatabase()
      } catch (error) {
        failures.push(error)
      }

      if (failures.length > 0) {
        logger.error(
          JSON.stringify({
            level: 'error',
            message: 'Graceful shutdown failed',
            errorNames: failures.map((error) => error.name),
          }),
        )
        throw new AggregateError(failures, 'Graceful shutdown failed')
      }

      logger.info(JSON.stringify({ level: 'info', message: 'Graceful shutdown complete' }))
    })()

    return shutdownPromise
  }
}
