import { createHash, randomBytes } from 'node:crypto'
import { ApiError } from '../../utils/ApiError.js'
import { AuditLog } from '../audit/auditLog.model.js'
import { Member } from '../members/member.model.js'
import { Membership } from '../memberships/models/membership.model.js'
import { Payment } from './payment.model.js'

function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function isDuplicateKey(error) {
  return error?.code === 11000
}

function fingerprint(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex')
}

function transactionSupported() {
  const topologyType = Payment.db?.getClient()?.topology?.description?.type
  return topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded'
}

async function runFinancialOperation(operation) {
  if (!transactionSupported()) {
    return operation(undefined)
  }
  const session = await Payment.db.startSession()
  try {
    return await session.withTransaction(() => operation(session))
  } finally {
    await session.endSession()
  }
}

async function writeAudit({
  actorId,
  action,
  payment,
  relatedTransaction,
  previousData,
  additionalData,
  ipAddress,
  session,
}) {
  const audit = new AuditLog({
    actor: actorId,
    action,
    module: 'payments',
    entityId: payment._id,
    ...(previousData ? { previousData } : {}),
    newData: {
      transactionCode: payment.transactionCode,
      type: payment.type,
      amountPaise: payment.amountPaise,
      status: payment.status,
      membershipId: payment.membership,
      ...(relatedTransaction ? { relatedTransaction } : {}),
      ...additionalData,
    },
    metadata: {
      memberId: payment.member,
      membershipId: payment.membership,
      ...(payment.reversalOf ? { reversalOf: payment.reversalOf } : {}),
    },
    ipAddress,
  })
  await audit.save(session ? { session } : undefined)
}

async function findIdempotentResult(idempotencyKey, requestFingerprint) {
  const existing = await Payment.findOne({ idempotencyKey }).select('+requestFingerprint')
  if (!existing) return null
  if (existing.requestFingerprint !== requestFingerprint) {
    throw new ApiError(409, 'Idempotency key was already used for a different request')
  }
  return existing.toObject({ versionKey: false })
}

async function updateMembershipBalance(membershipId, amountPaise, direction, session) {
  const increment =
    direction === 'receive'
      ? { amountPaidPaise: amountPaise, outstandingBalancePaise: -amountPaise }
      : { amountPaidPaise: -amountPaise, outstandingBalancePaise: amountPaise }
  const filter =
    direction === 'receive'
      ? { _id: membershipId, outstandingBalancePaise: { $gte: amountPaise } }
      : { _id: membershipId, amountPaidPaise: { $gte: amountPaise } }
  const options = { new: true, runValidators: true, ...(session ? { session } : {}) }
  return Membership.findOneAndUpdate(filter, { $inc: increment }, options)
}

async function compensateMembership(membershipId, amountPaise, direction) {
  const inverseDirection = direction === 'receive' ? 'reverse' : 'receive'
  const compensation = await updateMembershipBalance(
    membershipId,
    amountPaise,
    inverseDirection,
  )
  if (!compensation) {
    throw new Error('Payment operation failed and membership balance compensation did not match')
  }
}

function makeTransactionCode() {
  return `BAP-${randomBytes(8).toString('hex').toUpperCase()}`
}

export async function createPayment(input, actorId, ipAddress) {
  const requestFingerprint = fingerprint({
    ...input,
    paymentDate: input.paymentDate ?? null,
    referenceNumber: input.referenceNumber ?? null,
    notes: input.notes ?? null,
  })
  const prior = await findIdempotentResult(input.idempotencyKey, requestFingerprint)
  if (prior) return { payment: prior, replayed: true }

  const membership = await Membership.findById(input.membershipId)
  if (!membership) throw new ApiError(404, 'Membership not found')
  if (input.amountPaise > membership.outstandingBalancePaise) {
    throw new ApiError(409, 'Payment amount exceeds the outstanding membership balance')
  }
  let memberSnapshot = membership.memberSnapshot
  if (!memberSnapshot) {
    memberSnapshot = await Member.findById(membership.member)
      .select('memberCode fullName fatherName')
      .lean()
  }
  if (!memberSnapshot) {
    throw new ApiError(409, 'Member details are unavailable for this payment')
  }

  const paymentDate = input.paymentDate ?? startOfUtcDay(new Date())
  const payment = new Payment({
    transactionCode: makeTransactionCode(),
    idempotencyKey: input.idempotencyKey,
    requestFingerprint,
    type: 'payment',
    member: membership.member,
    memberSnapshot: {
      memberId: membership.member,
      memberCode: memberSnapshot.memberCode,
      fullName: memberSnapshot.fullName,
      fatherName: memberSnapshot.fatherName,
    },
    membership: membership._id,
    amountPaise: input.amountPaise,
    paymentMethod: input.paymentMethod,
    paymentDate,
    referenceNumber: input.referenceNumber ?? undefined,
    notes: input.notes ?? undefined,
    status: 'completed',
    reversedAmountPaise: 0,
    recordedBy: actorId,
  })

  let balanceUpdated = false
  let paymentSaved = false
  try {
    const saved = await runFinancialOperation(async (session) => {
      const balanceUpdate = await updateMembershipBalance(
        membership._id,
        input.amountPaise,
        'receive',
        session,
      )
      if (!balanceUpdate) {
        throw new ApiError(409, 'Payment amount exceeds the outstanding membership balance')
      }
      balanceUpdated = true
      await payment.save(session ? { session } : undefined)
      paymentSaved = true
      await writeAudit({
        actorId,
        action: 'payment.recorded',
        payment,
        ipAddress,
        session,
      })
      return payment.toObject({ versionKey: false })
    })
    return { payment: saved, replayed: false }
  } catch (error) {
    if (!transactionSupported() && balanceUpdated && !paymentSaved) {
      try {
        await compensateMembership(membership._id, input.amountPaise, 'receive')
      } catch (compensationError) {
        throw new AggregateError(
          [error, compensationError],
          'Payment creation failed and membership balance compensation also failed',
        )
      }
    }
    if (isDuplicateKey(error) || error.statusCode === 409) {
      const duplicate = await findIdempotentResult(input.idempotencyKey, requestFingerprint)
      if (duplicate) return { payment: duplicate, replayed: true }
      if (isDuplicateKey(error)) throw new ApiError(409, 'Duplicate payment transaction')
    }
    throw error
  }
}

export async function reversePayment(paymentId, input, actorId, ipAddress) {
  const original = await Payment.findById(paymentId)
  if (!original) throw new ApiError(404, 'Payment not found')
  const requestFingerprint = fingerprint({
    paymentId: original.id,
    ...input,
    paymentDate: input.paymentDate ?? null,
    notes: input.notes ?? null,
  })
  const prior = await findIdempotentResult(input.idempotencyKey, requestFingerprint)
  if (prior) return { payment: prior, replayed: true }
  if (original.type !== 'payment') {
    throw new ApiError(409, 'Only an original payment can be reversed')
  }
  if (original.status === 'reversed') {
    throw new ApiError(409, 'Payment has already been fully reversed')
  }
  const remainingPaise = original.amountPaise - original.reversedAmountPaise
  if (input.amountPaise > remainingPaise) {
    throw new ApiError(409, 'Cumulative reversals cannot exceed the original payment amount')
  }

  const updatedReversedAmount = original.reversedAmountPaise + input.amountPaise
  const nextStatus =
    updatedReversedAmount === original.amountPaise ? 'reversed' : 'completed'
  const correction = new Payment({
    transactionCode: makeTransactionCode(),
    idempotencyKey: input.idempotencyKey,
    requestFingerprint,
    type: 'reversal',
    member: original.member,
    memberSnapshot: original.memberSnapshot,
    membership: original.membership,
    amountPaise: input.amountPaise,
    paymentDate: input.paymentDate ?? startOfUtcDay(new Date()),
    notes: input.notes ?? undefined,
    status: 'completed',
    reversedAmountPaise: 0,
    reversalOf: original._id,
    recordedBy: actorId,
  })

  let originalUpdated = false
  let balanceUpdated = false
  let correctionSaved = false
  try {
    const saved = await runFinancialOperation(async (session) => {
      const options = { new: true, runValidators: true, ...(session ? { session } : {}) }
      const claimedOriginal = await Payment.findOneAndUpdate(
        {
          _id: original._id,
          type: 'payment',
          status: 'completed',
          reversedAmountPaise: original.reversedAmountPaise,
        },
        {
          $set: { status: nextStatus },
          $inc: { reversedAmountPaise: input.amountPaise },
        },
        options,
      )
      if (!claimedOriginal) {
        throw new ApiError(409, 'Payment changed while the reversal was being processed')
      }
      originalUpdated = true
      const balanceUpdate = await updateMembershipBalance(
        original.membership,
        input.amountPaise,
        'reverse',
        session,
      )
      if (!balanceUpdate) {
        throw new ApiError(409, 'Membership paid balance is insufficient for this reversal')
      }
      balanceUpdated = true
      await correction.save(session ? { session } : undefined)
      correctionSaved = true
      await writeAudit({
        actorId,
        action: 'payment.reversed',
        payment: correction,
        relatedTransaction: original.transactionCode,
        previousData: {
          status: original.status,
          reversedAmountPaise: original.reversedAmountPaise,
        },
        additionalData: {
          originalStatus: nextStatus,
          originalReversedAmountPaise: updatedReversedAmount,
        },
        ipAddress,
        session,
      })
      return correction.toObject({ versionKey: false })
    })
    return { payment: saved, replayed: false }
  } catch (error) {
    if (!transactionSupported() && !correctionSaved) {
      try {
        if (balanceUpdated) {
          await compensateMembership(original.membership, input.amountPaise, 'reverse')
        }
        if (originalUpdated) {
          const reverted = await Payment.findOneAndUpdate(
            {
              _id: original._id,
              reversedAmountPaise: updatedReversedAmount,
            },
            {
              $set: { status: original.status },
              $inc: { reversedAmountPaise: -input.amountPaise },
            },
            { new: true, runValidators: true },
          )
          if (!reverted) throw new Error('Original payment reversal compensation did not match')
        }
      } catch (compensationError) {
        throw new AggregateError(
          [error, compensationError],
          'Payment reversal failed and financial compensation also failed',
        )
      }
    }
    if (isDuplicateKey(error) || error.statusCode === 409) {
      const duplicate = await findIdempotentResult(input.idempotencyKey, requestFingerprint)
      if (duplicate) return { payment: duplicate, replayed: true }
      if (isDuplicateKey(error)) throw new ApiError(409, 'Duplicate payment correction')
    }
    throw error
  }
}
