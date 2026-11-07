import { z } from 'zod'

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i)

const dateValueSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'must be a valid calendar date')
  .transform((value) => new Date(`${value}T00:00:00.000Z`))

const idempotencyKeySchema = z.string().trim().min(8).max(128)
const optionalNotesSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.union([z.string().trim().max(2000), z.null()]).optional(),
)
const optionalReferenceSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.union([z.string().trim().max(100), z.null()]).optional(),
)

export const createPaymentSchema = z
  .object({
    membershipId: objectIdSchema,
    amountPaise: z.number().int().positive().safe(),
    paymentMethod: z.enum(['cash', 'upi']),
    paymentDate: dateValueSchema.optional(),
    referenceNumber: optionalReferenceSchema,
    notes: optionalNotesSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine(
    (value) =>
      value.paymentMethod !== 'cash' ||
      value.referenceNumber === undefined ||
      value.referenceNumber === null,
    { path: ['referenceNumber'], message: 'is only available for UPI payments' },
  )

export const createReversalSchema = z
  .object({
    amountPaise: z.number().int().positive().safe(),
    paymentDate: dateValueSchema.optional(),
    notes: optionalNotesSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()

export const paymentIdParamsSchema = z.object({
  paymentId: objectIdSchema,
})

export const paymentMemberIdParamsSchema = z.object({
  memberId: objectIdSchema,
})

export const paymentListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).default(''),
    memberId: objectIdSchema.optional(),
    membershipId: objectIdSchema.optional(),
    paymentMethod: z.enum(['cash', 'upi']).optional(),
    status: z.enum(['completed', 'reversed']).optional(),
    type: z.enum(['payment', 'reversal']).optional(),
    fromDate: dateValueSchema.optional(),
    toDate: dateValueSchema.optional(),
    sortBy: z.enum(['paymentDate', 'createdAt', 'amountPaise']).default('paymentDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine(
    (value) =>
      !value.fromDate || !value.toDate || value.fromDate <= value.toDate,
    { path: ['toDate'], message: 'must be on or after fromDate' },
  )

export function validateBody(schema) {
  return function validateRequestBody(req, res, next) {
    req.body = schema.parse(req.body)
    next()
  }
}

export function validateQuery(schema) {
  return function validateRequestQuery(req, res, next) {
    req.validatedQuery = schema.parse(req.query)
    next()
  }
}

export function validateParams(schema) {
  return function validateRequestParams(req, res, next) {
    req.validatedParams = schema.parse(req.params)
    next()
  }
}
