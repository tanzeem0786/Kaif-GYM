import { once } from 'node:events'
import { createApp } from './app.js'
import { connectDatabase, disconnectDatabase, getDatabaseStatus } from './configs/database.js'
import { parseEnvironment } from './configs/environment.js'
import { createGracefulShutdown } from './utils/gracefulShutdown.js'

async function startServer() {
  const config = parseEnvironment()

  await connectDatabase(config.MONGODB_URI)

  const app = createApp({
    allowedOrigins: config.CORS_ORIGIN,
    getDatabaseState: getDatabaseStatus,
    authConfig: config,
  })
  const server = app.listen(config.PORT)
  try {
    await once(server, 'listening')
  } catch (error) {
    await disconnectDatabase()
    throw new Error(
      `HTTP server failed to listen on port ${config.PORT} (${error.code ?? error.name}).`,
    )
  }

  console.log(
    JSON.stringify({
      level: 'info',
      message: 'HTTP server listening',
      port: config.PORT,
      environment: config.NODE_ENV,
    }),
  )

  const shutdown = createGracefulShutdown({ server, disconnectDatabase })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      shutdown(signal).catch(() => {
        process.exitCode = 1
      })
    })
  }
}

startServer().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
