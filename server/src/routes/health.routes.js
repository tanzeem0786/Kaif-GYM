import { Router } from 'express'
import { createHealthController } from '../controllers/health.controller.js'

export function createHealthRouter(getDatabaseState) {
  const healthRouter = Router()
  healthRouter.get('/', createHealthController(getDatabaseState))

  return healthRouter
}
