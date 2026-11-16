import { z } from 'zod'

const dateValueSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'must be a valid calendar date')
  .transform((value) => new Date(`${value}T00:00:00.000Z`))

const planFields = {
  name: z.string().trim().min(1).max(100),
  durationMonths: z.number().int().refine((value) => [1, 3, 6, 12].includes(value), {
    message: 'must be 1, 3, 6 or 12 months',
  }),
  pricePaise: z.number().int().nonnegative().safe(),
  description: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.union([z.string().trim().max(1000), z.null()]).optional(),
  ),
}

export const createPlanSchema = z.object(planFields).strict()
export const updatePlanSchema = z
  .object(
    Object.fromEntries(
      Object.entries(planFields).map(([field, schema]) => [field, schema.optional()]),
    ),
  )
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one plan field must be provided',
  })
export const planStatusSchema = z.object({ isActive: z.boolean() }).strict()

export const createMembershipSchema = z
  .object({
    memberId: z.string().regex(/^[a-f\d]{24}$/i),
    planId: z.string().regex(/^[a-f\d]{24}$/i),
    startDate: dateValueSchema,
  })
  .strict()

export const renewMembershipSchema = z
  .object({
    planId: z.string().regex(/^[a-f\d]{24}$/i),
    startDate: dateValueSchema.optional(),
  })
  .strict()

export const membershipIdParamsSchema = z.object({
  membershipId: z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid membership ID'),
})

export const planIdParamsSchema = z.object({
  planId: z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid plan ID'),
})

export const memberIdParamsSchema = z.object({
  memberId: z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid member ID'),
})

export const planListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
  durationMonths: z.coerce.number().int().refine((value) => [1, 3, 6, 12].includes(value)).optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  sortBy: z.enum(['name', 'durationMonths', 'pricePaise', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const membershipListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
  memberId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  planId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  status: z.enum(['active', 'expired', 'inactive', 'frozen']).optional(),
  sortBy: z.enum(['startDate', 'expiryDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
