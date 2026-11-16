import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { createCorsOptions } from './configs/cors.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'
import { requestLogger } from './middlewares/requestLogger.js'
import { createApiRouter } from './routes/api.routes.js'

export function createApp({
  allowedOrigins,
  getDatabaseState,
  authConfig,
  loginRateLimit,
  loginWindowMs,
}) {
  const app = express()

  app.disable('x-powered-by')
  app.use(requestLogger)
  app.use(helmet())
  app.use(cors(createCorsOptions(allowedOrigins)))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(
    '/api/v1',
    createApiRouter({
      getDatabaseState,
      authConfig,
      loginRateLimit,
      loginWindowMs,
    }),
  )
  app.use(notFound)
  app.use(errorHandler)

  return app
}
