import { z } from 'zod'
import { normalizePhone } from '../members/member.validation.js'

const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .transform(normalizePhone)
  .refine((value) => /^\+[1-9]\d{7,14}$/.test(value), {
    message: 'must be a valid phone number; use 10-digit Indian mobile numbers or include a country code',
  })

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.union([z.string().trim().email().max(254).transform((value) => value.toLowerCase()), z.null()]).optional(),
)

const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z
    .union([
      z.string().trim().url().max(2048).refine(
        (value) => ['http:', 'https:'].includes(new URL(value).protocol),
        { message: 'must be an HTTP or HTTPS URL' },
      ),
      z.null(),
    ])
    .optional(),
)

const dateValueSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a valid date in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'must be a valid calendar date')
  .transform((value) => new Date(`${value}T00:00:00.000Z`))

const trainerFields = {
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: phoneSchema,
  email: optionalEmail,
  profileImage: optionalUrl,
  specialization: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  joiningDate: dateValueSchema.optional(),
  notes: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.union([z.string().trim().max(2000), z.null()]).optional(),
  ),
}

export const createTrainerSchema = z.object(trainerFields).strict()
export const updateTrainerSchema = z
  .object(
    Object.fromEntries(
      Object.entries(trainerFields).map(([field, schema]) => [
        field,
        schema.optional(),
      ]),
    ),
  )
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one trainer field must be provided',
  })
export const trainerStatusSchema = z
  .object({ status: z.enum(['active', 'inactive']) })
  .strict()

export const trainerIdParamsSchema = z.object({
  trainerId: z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid trainer ID'),
})

export const trainerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['active', 'inactive']).optional(),
  sortBy: z.enum(['firstName', 'lastName', 'joiningDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
