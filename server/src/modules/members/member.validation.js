import { z } from 'zod'

const optionalText = (maxLength) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.union([z.string().trim().max(maxLength), z.null()]).optional(),
  )

export function normalizePhone(value) {
  const compact = value.trim().replace(/[()\s.-]/g, '')

  if (/^[6-9]\d{9}$/.test(compact)) {
    return `+91${compact}`
  }
  if (/^0[6-9]\d{9}$/.test(compact)) {
    return `+91${compact.slice(1)}`
  }
  if (/^91[6-9]\d{9}$/.test(compact)) {
    return `+${compact}`
  }
  if (/^\+91[6-9]\d{9}$/.test(compact)) {
    return compact
  }
  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact
  }

  return compact
}

const phoneSchema = z
  .string()
  .trim()
  .min(1, 'is required')
  .max(40)
  .transform(normalizePhone)
  .refine(
    (value) => /^\+[1-9]\d{7,14}$/.test(value),
    'must be a valid phone number; use 10-digit Indian mobile numbers or include a country code',
  )

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.union([
    z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    z.null(),
  ]).optional(),
)

const dateValueSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a valid date in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'must be a valid date')
  .transform((value) => new Date(`${value}T00:00:00.000Z`))

const optionalDate = z.preprocess(
  (value) => (value === '' ? null : value),
  z.union([dateValueSchema, z.null()]).optional(),
)

const addressSchema = z
  .object({
    text: optionalText(500),
  })
  .strict()
  .nullable()
  .optional()
const emergencyContactSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: phoneSchema,
  })
  .strict()
  .nullable()
  .optional()

const profileImageSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z
    .union([
      z
        .string()
        .trim()
        .url()
        .max(2048)
        .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
          message: 'must be an HTTP or HTTPS URL',
        }),
      z.null(),
    ])
    .optional(),
)

const memberFields = {
  fullName: z.string().trim().min(1).max(100),
  fatherName: z.string().trim().max(100),
  phone: phoneSchema,
  email: optionalEmail,
  gender: optionalText(50),
  dateOfBirth: optionalDate,
  address: addressSchema,
  profileImage: profileImageSchema,
  emergencyContact: emergencyContactSchema,
  registrationDate: dateValueSchema.optional(),
  notes: optionalText(2000),
}

export const createMemberSchema = z.object(memberFields).strict()

export const updateMemberSchema = z
  .object(
    Object.fromEntries(
      Object.entries(memberFields).map(([field, schema]) => [field, schema.optional()]),
    ),
  )
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one member field must be provided',
  })

export const memberIdParamsSchema = z.object({
  memberId: z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid member ID'),
})

export const memberListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['active', 'inactive']).optional(),
  sortBy: z
    .enum(['registrationDate', 'fullName', 'fatherName', 'memberCode', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const memberStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
})
