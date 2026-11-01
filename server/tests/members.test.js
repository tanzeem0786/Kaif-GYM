import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import test, { after, before, beforeEach } from 'node:test'
import { createApp } from '../src/app.js'
import { AuditLog } from '../src/modules/audit/auditLog.model.js'
import { Admin } from '../src/modules/auth/admin.model.js'
import { bootstrapAdmin } from '../src/modules/auth/admin.service.js'
import { Member } from '../src/modules/members/member.model.js'

const authConfig = {
  JWT_SECRET: 'm4-member-test-secret-with-at-least-thirty-two-characters',
  JWT_EXPIRES_IN: 3600,
  COOKIE_NAME: 'gym_admin_session',
  COOKIE_SECURE: false,
  COOKIE_SAME_SITE: 'lax',
}
const adminCredentials = {
  name: 'Member Test Admin',
  email: 'member-admin@example.test',
  password: 'M4-Member-Test-Admin-Password',
}

let admin

function createTestApp() {
  return createApp({
    allowedOrigins: ['http://localhost:5173'],
    getDatabaseState: () => 'connected',
    authConfig,
    AdminModel: Admin,
    MemberModel: Member,
    AuditLogModel: AuditLog,
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

async function login(baseUrl) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminCredentials.email,
      password: adminCredentials.password,
    }),
  })
  assert.equal(response.status, 200)
  return response.headers.get('set-cookie').split(';', 1)[0]
}

async function createMember(baseUrl, cookie, overrides = {}) {
  return fetch(`${baseUrl}/api/v1/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      firstName: 'Amina',
      lastName: 'Rahman',
      phone: '98765 43210',
      email: 'AMINA@example.test',
      ...overrides,
    }),
  })
}

before(async () => {
  const testUri = new URL(
    process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/kaifs_gym_members_test',
  )
  testUri.pathname = `/kaifs_gym_members_test_${process.pid}_${randomUUID().replaceAll('-', '')}`
  await mongoose.connect(testUri.toString(), { serverSelectionTimeoutMS: 5000 })
  await Promise.all([Admin.init(), Member.init(), AuditLog.init()])
  await bootstrapAdmin(adminCredentials, Admin)
  admin = await Admin.findOne({ email: adminCredentials.email })
})

beforeEach(async () => {
  await Promise.all([Member.deleteMany({}), AuditLog.collection.deleteMany({})])
})

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
  }
  await mongoose.disconnect()
})

test('member creation normalizes contact data and writes a limited audit record', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const response = await createMember(baseUrl, cookie, {
      address: { text: '12 Gym Road, Mumbai' },
      emergencyContact: { name: 'Nadia Rahman', phone: '9876543211' },
    })
    const body = await response.json()

    assert.equal(response.status, 201)
    assert.equal(body.success, true)
    assert.match(body.data.member.memberCode, /^KG-[A-F0-9]{12}$/)
    assert.equal(body.data.member.phone, '+919876543210')
    assert.equal(body.data.member.email, 'amina@example.test')
    assert.equal(body.data.member.status, 'active')
    assert.equal(body.data.member.address.text, '12 Gym Road, Mumbai')
    assert.equal(body.data.member.emergencyContact.phone, '+919876543211')

    const log = await AuditLog.findOne({ entityId: body.data.member._id }).lean()
    assert.equal(log.actor.toString(), admin.id)
    assert.equal(log.action, 'member.created')
    assert.equal(log.module, 'members')
    assert.equal(log.metadata.memberCode, body.data.member.memberCode)
    assert.equal(JSON.stringify(log).includes('9876543210'), false)
    await assert.rejects(
      AuditLog.updateOne({ _id: log._id }, { $set: { action: 'changed' } }),
      /append-only/,
    )
    await assert.rejects(AuditLog.deleteOne({ _id: log._id }), /append-only/)
  })
})

test('member validation rejects invalid phone, email and date fields', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const response = await createMember(baseUrl, cookie, {
      phone: '12345',
      email: 'not-an-email',
      dateOfBirth: '2024-02-31',
    })
    const body = await response.json()

    assert.equal(response.status, 400)
    assert.equal(body.success, false)
    assert.equal(body.message, 'Request validation failed')
    assert.ok(body.errors.some((issue) => issue.field === 'phone'))
    assert.ok(body.errors.some((issue) => issue.field === 'email'))
    assert.ok(body.errors.some((issue) => issue.field === 'dateOfBirth'))
    assert.equal(await Member.countDocuments(), 0)
  })
})

test('member list rejects invalid pagination, status and sort parameters', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const response = await fetch(
      `${baseUrl}/api/v1/members?page=0&limit=101&status=unknown&sortBy=password`,
      { headers: { Cookie: cookie } },
    )
    const body = await response.json()

    assert.equal(response.status, 400)
    assert.equal(body.success, false)
    assert.equal(body.message, 'Request validation failed')
    assert.ok(body.errors.length >= 4)
  })
})

test('member code and member list indexes prevent duplicate member codes', async () => {
  const member = await Member.create({
    memberCode: 'KG-0123456789AB',
    firstName: 'Test',
    lastName: 'Duplicate',
    phone: '+919876543210',
  })

  await assert.rejects(
    Member.create({
      memberCode: member.memberCode,
      firstName: 'Other',
      lastName: 'Member',
      phone: '+919876543211',
    }),
    (error) => error.code === 11000,
  )
  assert.equal(await Member.countDocuments({ memberCode: member.memberCode }), 1)
})

test('members can be searched, filtered and paginated', async () => {
  await Member.create([
    {
      memberCode: 'KG-111111111111',
      firstName: 'Amina',
      lastName: 'Rahman',
      phone: '+919876543210',
      status: 'active',
    },
    {
      memberCode: 'KG-222222222222',
      firstName: 'Bilal',
      lastName: 'Khan',
      phone: '+919876543211',
      status: 'inactive',
    },
    {
      memberCode: 'KG-333333333333',
      firstName: 'Amina',
      lastName: 'Shah',
      phone: '+919876543212',
      status: 'active',
    },
  ])

  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const response = await fetch(
      `${baseUrl}/api/v1/members?page=1&limit=1&search=amina&status=active&sortBy=firstName`,
      { headers: { Cookie: cookie } },
    )
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.data.members.length, 1)
    assert.equal(body.data.pagination.page, 1)
    assert.equal(body.data.pagination.limit, 1)
    assert.equal(body.data.pagination.total, 2)
    assert.equal(body.data.pagination.totalPages, 2)
    assert.equal(body.data.members[0].firstName, 'Amina')
  })
})

test('member details and updates preserve member code and record audit events', async () => {
  const member = await Member.create({
    memberCode: 'KG-444444444444',
    firstName: 'Omar',
    lastName: 'Ali',
    phone: '+919876543213',
  })

  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const detailResponse = await fetch(`${baseUrl}/api/v1/members/${member.id}`, {
      headers: { Cookie: cookie },
    })
    const detailBody = await detailResponse.json()
    assert.equal(detailResponse.status, 200)
    assert.equal(detailBody.data.member.memberCode, member.memberCode)

    const updateResponse = await fetch(`${baseUrl}/api/v1/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ firstName: 'Omaruddin', email: 'OMAR@example.test' }),
    })
    const updateBody = await updateResponse.json()
    assert.equal(updateResponse.status, 200)
    assert.equal(updateBody.data.member.firstName, 'Omaruddin')
    assert.equal(updateBody.data.member.email, 'omar@example.test')
    assert.equal(updateBody.data.member.memberCode, member.memberCode)

    const log = await AuditLog.findOne({
      entityId: member._id,
      action: 'member.updated',
    }).lean()
    assert.ok(log)
    assert.deepEqual(log.metadata.changedFields, ['firstName', 'email'])
  })
})

test('members can be deactivated, archived and reactivated with audit history', async () => {
  const member = await Member.create({
    memberCode: 'KG-555555555555',
    firstName: 'Sara',
    lastName: 'Noor',
    phone: '+919876543214',
  })

  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    for (const status of ['inactive', 'archived', 'active']) {
      const response = await fetch(`${baseUrl}/api/v1/members/${member.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ status }),
      })
      const body = await response.json()
      assert.equal(response.status, 200)
      assert.equal(body.data.member.status, status)
    }

    const logs = await AuditLog.find({ entityId: member._id }).sort({ createdAt: 1 }).lean()
    assert.deepEqual(
      logs.map((log) => log.action),
      ['member.deactivated', 'member.archived', 'member.reactivated'],
    )
  })
})

test('member endpoints require an authenticated admin', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/api/v1/members`),
      fetch(`${baseUrl}/api/v1/members/0123456789abcdef01234567`),
      fetch(`${baseUrl}/api/v1/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Unauthorized',
          lastName: 'Member',
          phone: '9876543210',
        }),
      }),
    ])

    for (const response of responses) {
      assert.equal(response.status, 401)
      const body = await response.json()
      assert.equal(body.success, false)
    }
  })
})
