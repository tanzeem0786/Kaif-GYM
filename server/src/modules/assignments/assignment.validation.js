import { z } from 'zod'

const dateValueSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a valid date in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'must be a valid calendar date')
  .transform((value) => new Date(`${value}T00:00:00.000Z`))

const proofSchema = z
  .object({
    url: z.string().trim().url().max(2048).refine(
      (value) => new URL(value).protocol === 'https:',
      { message: 'must be an HTTPS URL' },
    ),
    fileName: z.string().trim().min(1).max(255),
  })
  .strict()

const optionalNotes = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.union([z.string().trim().max(2000), z.null()]).optional(),
)

export const createAssignmentSchema = z
  .object({
    memberId: z.string().regex(/^[a-f\d]{24}$/i),
    trainerId: z.string().regex(/^[a-f\d]{24}$/i),
    startDate: dateValueSchema.optional(),
    proof: proofSchema,
    notes: optionalNotes,
  })
  .strict()

export const endAssignmentSchema = z
  .object({
    endDate: dateValueSchema,
  })
  .strict()

export const assignmentIdParamsSchema = z.object({
  assignmentId: z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid assignment ID'),
})

export const assignmentMemberIdParamsSchema = z.object({
  memberId: z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid member ID'),
})

export const assignmentTrainerIdParamsSchema = z.object({
  trainerId: z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid trainer ID'),
})

export const assignmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
  memberId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  trainerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  status: z.enum(['active', 'ended']).optional(),
  sortBy: z.enum(['startDate', 'endDate', 'createdAt']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
