import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(1, 'is required')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'must not exceed 72 UTF-8 bytes')

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: passwordSchema,
})

export const bootstrapAdminSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(12, 'must contain at least 12 characters')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'must not exceed 72 UTF-8 bytes'),
})
