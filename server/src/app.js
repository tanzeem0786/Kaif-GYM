import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { createCorsOptions } from './configs/cors.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'
import { requestLogger } from './middlewares/requestLogger.js'
import { createApiRouter } from './routes/api.routes.js'
import { Admin } from './modules/auth/admin.model.js'
import { Member } from './modules/members/member.model.js'
import { AuditLog } from './modules/audit/auditLog.model.js'
import { Membership } from './modules/memberships/models/membership.model.js'
import { MembershipPlan } from './modules/memberships/models/membershipPlan.model.js'

export function createApp({
  allowedOrigins,
  getDatabaseState,
  authConfig,
  AdminModel = Admin,
  MemberModel = Member,
  AuditLogModel = AuditLog,
  MembershipModel = Membership,
  MembershipPlanModel = MembershipPlan,
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
      AdminModel,
      MemberModel,
      AuditLogModel,
      MembershipModel,
      MembershipPlanModel,
      loginRateLimit,
      loginWindowMs,
    }),
  )
  app.use(notFound)
  app.use(errorHandler)

  return app
}
