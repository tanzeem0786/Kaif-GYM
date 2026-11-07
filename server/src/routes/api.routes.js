import { Router } from 'express'
import { createHealthRouter } from './health.routes.js'
import { sendSuccess } from '../utils/ApiResponse.js'
import { createAuthRouter } from '../modules/auth/auth.routes.js'
import { createMemberRouter } from '../modules/members/member.routes.js'
import {
  createMembershipPlanRouter,
  createMembershipRouter,
} from '../modules/memberships/membership.routes.js'
import { createTrainerRouter } from '../modules/trainers/trainer.routes.js'
import { createAssignmentRouter } from '../modules/assignments/assignment.routes.js'
import { createPaymentRouter } from '../modules/payments/payment.routes.js'
import { createCommissionAgreementRouter } from '../modules/commissions/commissionAgreement.routes.js'

export function createApiRouter({
  getDatabaseState,
  authConfig,
  AdminModel,
  MemberModel,
  AuditLogModel,
  MembershipModel,
  MembershipPlanModel,
  TrainerModel,
  AssignmentModel,
  PaymentModel,
  CommissionAgreementModel,
  loginRateLimit,
  loginWindowMs,
}) {
  const apiRouter = Router()

  apiRouter.get('/', (req, res) => {
    sendSuccess(res, { apiVersion: 'v1' }, "Kaif's GYM API is available")
  })
  apiRouter.use('/health', createHealthRouter(getDatabaseState))
  if (authConfig) {
    apiRouter.use(
      '/auth',
      createAuthRouter({ authConfig, AdminModel, loginRateLimit, loginWindowMs }),
    )
    apiRouter.use(
      '/members',
      createMemberRouter({ authConfig, AdminModel, MemberModel, AuditLogModel }),
    )
    const membershipDependencies = {
      authConfig,
      AdminModel,
      MemberModel,
      MembershipModel,
      MembershipPlanModel,
      AuditLogModel,
    }
    apiRouter.use('/membership-plans', createMembershipPlanRouter(membershipDependencies))
    apiRouter.use('/memberships', createMembershipRouter(membershipDependencies))
    apiRouter.use(
      '/trainers',
      createTrainerRouter({ authConfig, AdminModel, TrainerModel, AuditLogModel }),
    )
    apiRouter.use(
      '/trainer-assignments',
      createAssignmentRouter({
        authConfig,
        AdminModel,
        MemberModel,
        TrainerModel,
        AssignmentModel,
        AuditLogModel,
      }),
    )
    apiRouter.use(
      '/payments',
      createPaymentRouter({
        authConfig,
        AdminModel,
        MemberModel,
        MembershipModel,
        PaymentModel,
        AuditLogModel,
      }),
    )
    apiRouter.use(
      '/commission-agreements',
      createCommissionAgreementRouter({
        authConfig,
        AdminModel,
        TrainerModel,
        CommissionAgreementModel,
        AuditLogModel,
      }),
    )
  }

  return apiRouter
}
