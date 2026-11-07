import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { createPaymentService } from './payment.service.js'

export function createPaymentController({
  MemberModel,
  MembershipModel,
  PaymentModel,
  AuditLogModel,
}) {
  const service = createPaymentService({
    MemberModel,
    MembershipModel,
    PaymentModel,
    AuditLogModel,
  })

  return {
    create: asyncHandler(async (req, res) => {
      const { payment, replayed } = await service.create(req.body, req.admin.id, req.ip)
      sendSuccess(
        res,
        { payment },
        replayed ? 'Payment request already processed' : 'Payment recorded successfully',
        replayed ? 200 : 201,
      )
    }),

    reverse: asyncHandler(async (req, res) => {
      const { payment, replayed } = await service.reverse(
        req.validatedParams.paymentId,
        req.body,
        req.admin.id,
        req.ip,
      )
      sendSuccess(
        res,
        { payment },
        replayed ? 'Reversal request already processed' : 'Payment reversal recorded successfully',
        replayed ? 200 : 201,
      )
    }),

    list: asyncHandler(async (req, res) => {
      sendSuccess(res, await service.list(req.validatedQuery), 'Payments retrieved successfully')
    }),

    listByMember: asyncHandler(async (req, res) => {
      sendSuccess(
        res,
        await service.listByMember(req.validatedParams.memberId, req.validatedQuery),
        'Member payment history retrieved successfully',
      )
    }),

    getById: asyncHandler(async (req, res) => {
      sendSuccess(
        res,
        await service.getById(req.validatedParams.paymentId),
        'Payment details retrieved successfully',
      )
    }),

    receipt: asyncHandler(async (req, res) => {
      sendSuccess(
        res,
        await service.getReceipt(req.validatedParams.paymentId),
        'Payment receipt retrieved successfully',
      )
    }),
  }
}
