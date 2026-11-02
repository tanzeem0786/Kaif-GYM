import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import test, { after, before, beforeEach } from 'node:test'
import { createApp } from '../src/app.js'
import { TrainerAssignment } from '../src/modules/assignments/assignment.model.js'
import { AuditLog } from '../src/modules/audit/auditLog.model.js'
import { Admin } from '../src/modules/auth/admin.model.js'
import { bootstrapAdmin } from '../src/modules/auth/admin.service.js'
import { Member } from '../src/modules/members/member.model.js'
import { Trainer } from '../src/modules/trainers/trainer.model.js'

const authConfig = {
  JWT_SECRET: 'm6-trainer-test-secret-with-at-least-thirty-two-characters',
  JWT_EXPIRES_IN: 3600,
  COOKIE_NAME: 'gym_admin_session',
  COOKIE_SECURE: false,
  COOKIE_SAME_SITE: 'lax',
}
const adminCredentials = {
  name: 'Trainer Test Admin',
  email: 'trainer-admin@example.test',
  password: 'M6-Trainer-Test-Admin-Password',
}

let admin

function createTestApp() {
  return createApp({
    allowedOrigins: ['http://localhost:5173'],
    getDatabaseState: () => 'connected',
    authConfig,
    AdminModel: Admin,
    MemberModel: Member,
    TrainerModel: Trainer,
    AssignmentModel: TrainerAssignment,
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

function jsonHeaders(cookie) {
  return { 'Content-Type': 'application/json', Cookie: cookie }
}

async function createTrainer(baseUrl, cookie, overrides = {}) {
  return fetch(`${baseUrl}/api/v1/trainers`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({
      firstName: 'Nadia',
      lastName: 'Khan',
      phone: '98765 43210',
      email: 'NADIA@example.test',
      specialization: ['Strength'],
      joiningDate: '2025-01-02',
      ...overrides,
    }),
  })
}

async function createMember() {
  return Member.create({
    memberCode: `KG-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
    firstName: 'Amina',
    lastName: 'Rahman',
    phone: '+919876543210',
  })
}

async function assignTrainer(baseUrl, cookie, memberId, trainerId, overrides = {}) {
  return fetch(`${baseUrl}/api/v1/trainer-assignments`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({
      memberId,
      trainerId,
      startDate: '2025-02-01',
      proof: { url: 'https://files.example.test/proof/assignment.pdf', fileName: 'agreement.pdf' },
      ...overrides,
    }),
  })
}

before(async () => {
  const testUri = new URL(
    process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/kaifs_gym_test',
  )
  testUri.pathname = `/gym_m6_${process.pid}_${randomUUID().replaceAll('-', '')}`
  await mongoose.connect(testUri.toString(), { serverSelectionTimeoutMS: 5000 })
  await Promise.all([
    Admin.init(),
    Member.init(),
    Trainer.init(),
    TrainerAssignment.init(),
    AuditLog.init(),
  ])
  await bootstrapAdmin(adminCredentials, Admin)
  admin = await Admin.findOne({ email: adminCredentials.email })
})

beforeEach(async () => {
  await Promise.all([
    Member.deleteMany({}),
    Trainer.deleteMany({}),
    TrainerAssignment.deleteMany({}),
    AuditLog.collection.deleteMany({}),
  ])
})

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
  }
  await mongoose.disconnect()
})

test('trainer CRUD validates contact details and writes append-only audits', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const createdResponse = await createTrainer(baseUrl, cookie)
    const createdBody = await createdResponse.json()
    assert.equal(createdResponse.status, 201)
    const trainer = createdBody.data.trainer
    assert.match(trainer.trainerCode, /^KGT-[A-F0-9]{12}$/)
    assert.equal(trainer.phone, '+919876543210')
    assert.equal(trainer.email, 'nadia@example.test')
    assert.deepEqual(trainer.specialization, ['Strength'])

    const detailsResponse = await fetch(`${baseUrl}/api/v1/trainers/${trainer._id}`, {
      headers: { Cookie: cookie },
    })
    assert.equal(detailsResponse.status, 200)
    assert.equal((await detailsResponse.json()).data.trainer.trainerCode, trainer.trainerCode)

    const updateResponse = await fetch(`${baseUrl}/api/v1/trainers/${trainer._id}`, {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ specialization: ['Strength', 'Mobility'] }),
    })
    assert.equal(updateResponse.status, 200)
    const updateBody = await updateResponse.json()
    assert.deepEqual(updateBody.data.trainer.specialization, ['Strength', 'Mobility'])

    const logs = await AuditLog.find({ entityId: trainer._id }).sort({ createdAt: 1 }).lean()
    assert.deepEqual(logs.map(({ action }) => action), ['trainer.created', 'trainer.updated'])
    assert.equal(logs[0].actor.toString(), admin.id)
    assert.equal(JSON.stringify(logs).includes('9876543210'), false)
    await assert.rejects(AuditLog.deleteOne({ _id: logs[0]._id }), /append-only/)
  })
})

test('trainer validation and listing enforce filters, search and pagination', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const invalid = await createTrainer(baseUrl, cookie, {
      phone: '12345',
      email: 'not-an-email',
    })
    assert.equal(invalid.status, 400)
    assert.equal(await Trainer.countDocuments(), 0)

    await createTrainer(baseUrl, cookie)
    await createTrainer(baseUrl, cookie, {
      firstName: 'Omar',
      lastName: 'Ali',
      phone: '9876543211',
      specialization: ['Cardio'],
    })
    const response = await fetch(
      `${baseUrl}/api/v1/trainers?search=Omar&status=active&page=1&limit=1`,
      { headers: { Cookie: cookie } },
    )
    const body = await response.json()
    assert.equal(response.status, 200)
    assert.equal(body.data.trainers.length, 1)
    assert.equal(body.data.trainers[0].firstName, 'Omar')
    assert.equal(body.data.pagination.total, 1)
  })
})

test('trainer status is admin-protected and deactivation preserves assignment records', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const trainerResponse = await createTrainer(baseUrl, cookie)
    const trainer = (await trainerResponse.json()).data.trainer
    const member = await createMember()
    const assignmentResponse = await assignTrainer(baseUrl, cookie, member.id, trainer._id)
    assert.equal(assignmentResponse.status, 201)
    const assignment = (await assignmentResponse.json()).data.assignment
    const historyResponse = await fetch(
      `${baseUrl}/api/v1/trainer-assignments/trainer/${trainer._id}`,
      { headers: { Cookie: cookie } },
    )
    assert.equal(historyResponse.status, 200)
    assert.equal((await historyResponse.json()).data.assignments.length, 1)

    const deactivation = await fetch(`${baseUrl}/api/v1/trainers/${trainer._id}/status`, {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ status: 'inactive' }),
    })
    assert.equal(deactivation.status, 200)
    assert.equal((await deactivation.json()).data.trainer.status, 'inactive')
    assert.equal(await TrainerAssignment.countDocuments({ _id: assignment._id }), 1)

    const deniedCreate = await assignTrainer(baseUrl, cookie, member.id, trainer._id)
    assert.equal(deniedCreate.status, 409)

    const reactivation = await fetch(`${baseUrl}/api/v1/trainers/${trainer._id}/status`, {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ status: 'active' }),
    })
    assert.equal(reactivation.status, 200)

    const unauthorized = await fetch(`${baseUrl}/api/v1/trainers`)
    assert.equal(unauthorized.status, 401)
    const unauthorizedAssignments = await fetch(`${baseUrl}/api/v1/trainer-assignments`)
    assert.equal(unauthorizedAssignments.status, 401)
  })
})

test('assignments require HTTPS proof and valid dates, allow concurrent records, and retain ended history', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const trainerResponse = await createTrainer(baseUrl, cookie)
    const trainer = (await trainerResponse.json()).data.trainer
    const member = await createMember()

    const invalidProof = await assignTrainer(baseUrl, cookie, member.id, trainer._id, {
      proof: { url: 'http://files.example.test/proof.pdf', fileName: 'proof.pdf' },
    })
    assert.equal(invalidProof.status, 400)

    const firstResponse = await assignTrainer(baseUrl, cookie, member.id, trainer._id)
    const secondResponse = await assignTrainer(baseUrl, cookie, member.id, trainer._id)
    assert.equal(firstResponse.status, 201)
    assert.equal(secondResponse.status, 201)
    const first = (await firstResponse.json()).data.assignment
    assert.equal((await secondResponse.json()).data.assignment.member, member.id)

    const beforeStart = await fetch(`${baseUrl}/api/v1/trainer-assignments/${first._id}/end`, {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ endDate: '2025-01-31' }),
    })
    assert.equal(beforeStart.status, 400)

    const endedResponse = await fetch(`${baseUrl}/api/v1/trainer-assignments/${first._id}/end`, {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ endDate: '2025-02-10' }),
    })
    assert.equal(endedResponse.status, 200)
    const ended = (await endedResponse.json()).data.assignment
    assert.equal(ended.status, 'ended')
    assert.equal(ended.endDate, '2025-02-10T00:00:00.000Z')

    const historyResponse = await fetch(
      `${baseUrl}/api/v1/trainer-assignments/member/${member.id}?status=ended`,
      { headers: { Cookie: cookie } },
    )
    const history = await historyResponse.json()
    assert.equal(historyResponse.status, 200)
    assert.equal(history.data.assignments.length, 1)
    assert.equal(history.data.assignments[0].proof.fileName, 'agreement.pdf')

    const logs = await AuditLog.find({ module: 'trainerAssignments' }).lean()
    assert.equal(logs.length, 3)
    assert.ok(logs.every((log) => !JSON.stringify(log).includes('files.example.test')))
    assert.deepEqual(
      logs.map((log) => log.action).sort(),
      ['trainerAssignment.created', 'trainerAssignment.created', 'trainerAssignment.ended'].sort(),
    )
  })
})
