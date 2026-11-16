import { Router } from 'express'
import { validateBody, validateParams, validateQuery } from '../../middlewares/requestValidation.js'
import { paymentController } from './payment.controller.js'
import {
  createPaymentSchema,
  createReversalSchema,
  paymentIdParamsSchema,
  paymentListQuerySchema,
  paymentMemberIdParamsSchema,
} from './payment.validation.js'

const router = Router()

router
  .route('/')
  .get(validateQuery(paymentListQuerySchema), paymentController.list)
  .post(validateBody(createPaymentSchema), paymentController.create)
router.get(
  '/member/:memberId',
  validateParams(paymentMemberIdParamsSchema),
  validateQuery(paymentListQuerySchema),
  paymentController.listByMember,
)
router.post(
  '/:paymentId/reversals',
  validateParams(paymentIdParamsSchema),
  validateBody(createReversalSchema),
  paymentController.reverse,
)
router.get(
  '/:paymentId/receipt',
  validateParams(paymentIdParamsSchema),
  paymentController.receipt,
)
router.get(
  '/:paymentId',
  validateParams(paymentIdParamsSchema),
  paymentController.getById,
)

export { router as paymentRouter }
