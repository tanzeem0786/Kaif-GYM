import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

const serverDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
dotenv.config({ path: resolve(serverDirectory, '.env'), quiet: true })

const originSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const url = new URL(value)
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    )
  }, 'must be an HTTP(S) origin without a path, query, or credentials')
  .transform((value) => new URL(value).origin)

const jwtExpirySchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*[smhd]$/, 'must be a positive duration such as 15m, 12h, or 1d')
  .transform((value) => {
    const amount = Number.parseInt(value, 10)
    const unit = value.at(-1)
    const secondsPerUnit = { s: 1, m: 60, h: 3600, d: 86400 }
    return amount * secondsPerUnit[unit]
  })
  .refine(Number.isSafeInteger, 'must be a safe integer duration')

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGODB_URI: z
      .string()
      .trim()
      .min(1, 'is required')
      .regex(/^mongodb(?:\+srv)?:\/\//, 'must be a mongodb:// or mongodb+srv:// URI'),
    JWT_SECRET: z.string().min(32, 'must contain at least 32 characters'),
    JWT_EXPIRES_IN: jwtExpirySchema,
    COOKIE_NAME: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]+$/, 'may contain only letters, numbers, underscores, and hyphens'),
    COOKIE_SECURE: z.enum(['true', 'false']).transform((value) => value === 'true'),
    COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']),
    CLIENT_URL: originSchema,
    CORS_ORIGIN: z
      .string()
      .trim()
      .min(1, 'is required')
      .transform((value) => value.split(',').map((origin) => origin.trim()))
      .pipe(z.array(originSchema).min(1)),
  })
  .superRefine((config, context) => {
    if (!config.CORS_ORIGIN.includes(config.CLIENT_URL)) {
      context.addIssue({
        code: 'custom',
        path: ['CORS_ORIGIN'],
        message: 'must include the CLIENT_URL origin',
      })
    }

    if (config.COOKIE_SAME_SITE === 'none' && !config.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'must be true when COOKIE_SAME_SITE is none',
      })
    }

    if (config.NODE_ENV === 'production' && !config.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'must be true in production',
      })
    }
  })

export function parseEnvironment(source = process.env) {
  const result = environmentSchema.safeParse(source)

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const key = issue.path.join('.')
        const message = source[key] === undefined ? 'is required' : issue.message
        return `- ${key || 'environment'}: ${message}`
      })
      .join('\n')

    throw new Error(`Invalid environment configuration:\n${details}`)
  }

  return result.data
}
