import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import test, { after, before } from 'node:test'
import { createApp } from '../src/app.js'
import { Admin } from '../src/modules/auth/admin.model.js'
import { bootstrapAdmin } from '../src/modules/auth/admin.service.js'
import { ApiError } from '../src/utils/ApiError.js'

const jwtSecret = 'm2-auth-test-secret-with-at-least-thirty-two-characters'
const adminPassword = 'M2-Test-Password-That-Is-Strong'
const adminEmail = 'owner@example.test'
const cookieName = 'gym_admin_session'
const authConfig = {
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: 3600,
  COOKIE_NAME: cookieName,
  COOKIE_SECURE: false,
  COOKIE_SAME_SITE: 'lax',
}

let admin

function createTestApp(options = {}) {
  return createApp({
    allowedOrigins: ['http://localhost:5173'],
    getDatabaseState: () => 'connected',
    authConfig: options.authConfig ?? authConfig,
    loginRateLimit: options.loginRateLimit,
    loginWindowMs: options.loginWindowMs,
  })
}

async function withServer(app, run) {
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  try {
    await run(`http://127.0.0.1:${server.address().port}`)
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

async function postLogin(baseUrl, body) {
  return fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function cookiePair(response) {
  const cookie = response.headers.get('set-cookie')
  assert.ok(cookie, 'expected authentication Set-Cookie header')
  return cookie.split(';', 1)[0]
}

before(async () => {
  const testUri = new URL(
    process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/kaifs_gym_auth_test',
  )
  testUri.pathname = `/kaifs_gym_auth_test_${process.pid}_${randomUUID().replaceAll('-', '')}`
  await mongoose.connect(testUri.toString(), { serverSelectionTimeoutMS: 5000 })
  await Admin.init()

  const attempts = await Promise.allSettled([
    bootstrapAdmin(
      { name: 'Gym Owner', email: adminEmail, password: adminPassword },
    ),
    bootstrapAdmin(
      { name: 'Gym Owner', email: adminEmail, password: adminPassword },
    ),
  ])
  const successfulBootstraps = attempts.filter((attempt) => attempt.status === 'fulfilled')
  const rejectedBootstraps = attempts.filter((attempt) => attempt.status === 'rejected')

  assert.equal(successfulBootstraps.length, 1)
  assert.equal(rejectedBootstraps.length, 1)
  assert.ok(rejectedBootstraps[0].reason instanceof ApiError)
  assert.equal(rejectedBootstraps[0].reason.statusCode, 409)

  admin = await Admin.findOne().select('+passwordHash')
  assert.equal(admin.email, adminEmail)
  assert.match(admin.passwordHash, /^\$2[aby]\$/)
  assert.notEqual(admin.passwordHash, adminPassword)
  assert.equal(await admin.verifyPassword(adminPassword), true)
})

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
  }
  await mongoose.disconnect()
})

test('admin bootstrap rejects a second account', async () => {
  await assert.rejects(
    bootstrapAdmin(
      { name: 'Second Owner', email: 'second-owner@example.test', password: adminPassword },
    ),
    (error) => error instanceof ApiError && error.statusCode === 409,
  )
  assert.equal(await Admin.countDocuments(), 1)
})

test('login accepts normalized email and sets an HTTP-only JWT cookie', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const response = await postLogin(baseUrl, {
      email: '  OWNER@EXAMPLE.TEST ',
      password: adminPassword,
    })
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.success, true)
    assert.deepEqual(body.data.admin, {
      id: admin.id,
      name: 'Gym Owner',
      email: adminEmail,
    })
    assert.equal(JSON.stringify(body).includes('passwordHash'), false)
    assert.equal(JSON.stringify(body).includes(jwtSecret), false)

    const setCookie = response.headers.get('set-cookie')
    assert.match(setCookie, new RegExp(`^${cookieName}=`))
    assert.match(setCookie, /HttpOnly/i)
    assert.match(setCookie, /SameSite=Lax/i)
    assert.match(setCookie, /Max-Age=3600/i)

    const token = cookiePair(response).slice(cookieName.length + 1)
    const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] })
    assert.equal(payload.sub, admin.id)
  })
})

test('login cookie uses configured Secure and SameSite attributes', async () => {
  const secureConfig = {
    ...authConfig,
    COOKIE_NAME: 'secure_owner_cookie',
    COOKIE_SECURE: true,
    COOKIE_SAME_SITE: 'strict',
  }

  await withServer(createTestApp({ authConfig: secureConfig }), async (baseUrl) => {
    const response = await postLogin(baseUrl, {
      email: adminEmail,
      password: adminPassword,
    })
    assert.equal(response.status, 200)
    assert.match(response.headers.get('set-cookie'), /^secure_owner_cookie=/)
    assert.match(response.headers.get('set-cookie'), /Secure/i)
    assert.match(response.headers.get('set-cookie'), /SameSite=Strict/i)
  })
})

test('missing credentials are rejected by request validation', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const response = await postLogin(baseUrl, { email: adminEmail })
    const body = await response.json()

    assert.equal(response.status, 400)
    assert.equal(body.success, false)
    assert.equal(body.message, 'Request validation failed')
    assert.ok(body.errors.some((issue) => issue.field === 'password'))
  })
})

test('invalid email or password returns the same unauthorized response', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const wrongPassword = await postLogin(baseUrl, {
      email: adminEmail,
      password: 'a-different-password',
    })
    const unknownEmail = await postLogin(baseUrl, {
      email: 'unknown@example.test',
      password: 'a-different-password',
    })

    assert.equal(wrongPassword.status, 401)
    assert.equal(unknownEmail.status, 401)
    assert.deepEqual(await wrongPassword.json(), await unknownEmail.json())
  })
})

test('inactive admin cannot log in or continue to use an existing token', async () => {
  const token = jwt.sign({}, jwtSecret, {
    algorithm: 'HS256',
    subject: admin.id,
    issuer: 'kaifs-gym-api',
    audience: 'kaifs-gym-admin',
    expiresIn: 3600,
  })
  admin.isActive = false
  await admin.save()

  try {
    await withServer(createTestApp(), async (baseUrl) => {
      const login = await postLogin(baseUrl, {
        email: adminEmail,
        password: adminPassword,
      })
      assert.equal(login.status, 401)

      const me = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Cookie: `${cookieName}=${token}` },
      })
      assert.equal(me.status, 401)
    })
  } finally {
    admin.isActive = true
    await admin.save()
  }
})

test('protected admin route rejects missing, invalid, and expired JWTs', async () => {
  const expiredToken = jwt.sign({}, jwtSecret, {
    algorithm: 'HS256',
    subject: admin.id,
    issuer: 'kaifs-gym-api',
    audience: 'kaifs-gym-admin',
    expiresIn: -1,
  })

  await withServer(createTestApp(), async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/v1/auth/me`)
    const invalid = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: `${cookieName}=not-a-jwt` },
    })
    const expired = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: `${cookieName}=${expiredToken}` },
    })

    for (const response of [missing, invalid, expired]) {
      assert.equal(response.status, 401)
      assert.deepEqual(await response.json(), {
        success: false,
        message: 'Authentication required',
        errors: [],
      })
    }
  })
})

test('authenticated admin can access /me without exposing credentials', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const login = await postLogin(baseUrl, {
      email: adminEmail,
      password: adminPassword,
    })
    const me = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: cookiePair(login) },
    })
    const body = await me.json()

    assert.equal(me.status, 200)
    assert.deepEqual(body.data.admin, {
      id: admin.id,
      name: 'Gym Owner',
      email: adminEmail,
    })
    assert.equal(JSON.stringify(body).includes('passwordHash'), false)
  })
})

test('logout clears the configured authentication cookie', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/auth/logout`, { method: 'POST' })
    const body = await response.json()
    const setCookie = response.headers.get('set-cookie')

    assert.equal(response.status, 200)
    assert.equal(body.data, null)
    assert.match(setCookie, new RegExp(`^${cookieName}=;`))
    assert.match(setCookie, /HttpOnly/i)
    assert.match(setCookie, /SameSite=Lax/i)
    assert.match(setCookie, /Expires=Thu, 01 Jan 1970/i)
  })
})

test('public registration route does not exist', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unapproved Account',
        email: 'public@example.test',
        password: adminPassword,
      }),
    })

    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), {
      success: false,
      message: 'Route not found',
      errors: [],
    })
  })
})

test('login rate limit returns a consistent 429 response', async () => {
  await withServer(
    createTestApp({ loginRateLimit: 2, loginWindowMs: 60_000 }),
    async (baseUrl) => {
      const responses = []
      for (let attempt = 0; attempt < 3; attempt += 1) {
        responses.push(
          await postLogin(baseUrl, {
            email: adminEmail,
            password: 'incorrect-password',
          }),
        )
      }

      assert.deepEqual(
        responses.map((response) => response.status),
        [401, 401, 429],
      )
      assert.deepEqual(await responses[2].json(), {
        success: false,
        message: 'Too many login attempts. Please try again later.',
        errors: [],
      })
    },
  )
})
