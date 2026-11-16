import { ApiError } from '../../utils/ApiError.js'
import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { Member } from '../members/member.model.js'
import { Payment } from './payment.model.js'
import { createPayment, reversePayment } from './payment.service.js'

function paymentProjection() {
  return [
    { path: 'member', select: 'memberCode fullName fatherName phone email' },
    {
      path: 'membership',
      select: 'membershipCode totalFeePaise amountPaidPaise outstandingBalancePaise status',
    },
    { path: 'recordedBy', select: 'name email' },
  ]
}

async function getPaymentDetails(paymentId) {
  const payment = await Payment.findById(paymentId)
    .populate(paymentProjection())
    .populate({ path: 'reversalOf', select: 'transactionCode amountPaise status' })
    .lean()
  if (!payment) throw new ApiError(404, 'Payment not found')
  const reversals =
    payment.type === 'payment'
      ? await Payment.find({ reversalOf: payment._id })
          .sort({ paymentDate: 1, _id: 1 })
          .populate({ path: 'recordedBy', select: 'name email' })
          .lean()
      : []
  return { payment, reversals }
}

async function listPayments(options, memberId) {
  const {
    page,
    limit,
    search,
    membershipId,
    paymentMethod,
    status,
    type,
    fromDate,
    toDate,
    sortBy,
    sortOrder,
  } = options
  const filter = {}
  const filterMemberId = memberId ?? options.memberId
  if (filterMemberId) filter.member = filterMemberId
  if (membershipId) filter.membership = membershipId
  if (paymentMethod) filter.paymentMethod = paymentMethod
  if (status) filter.status = status
  if (type) filter.type = type
  if (fromDate || toDate) {
    filter.paymentDate = {}
    if (fromDate) filter.paymentDate.$gte = fromDate
    if (toDate) filter.paymentDate.$lt = new Date(toDate.getTime() + 86400000)
  }
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(escapedSearch, 'i')
    const [memberIds, snapshotPaymentIds, transactionPaymentIds] = await Promise.all([
      Member.find({
        $or: [
          { memberCode: pattern },
          { fullName: pattern },
          { fatherName: pattern },
          { phone: pattern },
        ],
      }).distinct('_id'),
      Payment.find({
        $or: [
          { 'memberSnapshot.memberCode': pattern },
          { 'memberSnapshot.fullName': pattern },
          { 'memberSnapshot.fatherName': pattern },
        ],
      }).distinct('_id'),
      Payment.find({ transactionCode: pattern }).distinct('_id'),
    ])
    filter.$or = [
      { member: { $in: memberIds } },
      { _id: { $in: snapshotPaymentIds } },
      { _id: { $in: transactionPaymentIds } },
    ]
  }
  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(paymentProjection())
      .populate({ path: 'reversalOf', select: 'transactionCode amountPaise' })
      .lean(),
    Payment.countDocuments(filter),
  ])
  return {
    payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export const paymentController = {
  create: asyncHandler(async (req, res) => {
    const { payment, replayed } = await createPayment(req.body, req.admin.id, req.ip)
    sendSuccess(
      res,
      { payment },
      replayed ? 'Payment request already processed' : 'Payment recorded successfully',
      replayed ? 200 : 201,
    )
  }),

  reverse: asyncHandler(async (req, res) => {
    const { payment, replayed } = await reversePayment(
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
    sendSuccess(
      res,
      await listPayments(req.validatedQuery),
      'Payments retrieved successfully',
    )
  }),

  listByMember: asyncHandler(async (req, res) => {
    const { memberId } = req.validatedParams
    sendSuccess(
      res,
      await listPayments(req.validatedQuery, memberId),
      'Member payment history retrieved successfully',
    )
  }),

  getById: asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await getPaymentDetails(req.validatedParams.paymentId),
      'Payment details retrieved successfully',
    )
  }),

  receipt: asyncHandler(async (req, res) => {
    const requested = await getPaymentDetails(req.validatedParams.paymentId)
    if (requested.payment.type === 'reversal') {
      const originalId = requested.payment.reversalOf?._id ?? requested.payment.reversalOf
      const original = await getPaymentDetails(originalId)
      sendSuccess(
        res,
        {
          payment: original.payment,
          reversals: original.reversals,
          requestedCorrection: requested.payment,
        },
        'Payment receipt retrieved successfully',
      )
      return
    }
    sendSuccess(res, requested, 'Payment receipt retrieved successfully')
  }),
}
