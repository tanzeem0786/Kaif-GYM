import { z } from 'zod'

const dateValueSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a valid date in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'must be a valid calendar date')
  .transform((value) => new Date(`${value}T00:00:00.000Z`))

const optionalDateValueSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z.union([dateValueSchema, z.null()]).optional(),
)

export const createCommissionAgreementSchema = z
  .object({
    commissionBasis: z.enum(['membership_fee', 'received_payment']),
    effectiveFrom: dateValueSchema,
    effectiveTo: optionalDateValueSchema,
  })
  .strict()
  .refine(
    ({ effectiveFrom, effectiveTo }) =>
      !effectiveTo || effectiveTo >= effectiveFrom,
    {
      message: 'must be on or after the effective-from date',
      path: ['effectiveTo'],
    },
  )

export const commissionAgreementIdParamsSchema = z.object({
  agreementId: z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid agreement ID'),
})

export const commissionAgreementTrainerParamsSchema = z.object({
  trainerId: z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid trainer ID'),
})

export const commissionAgreementListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
