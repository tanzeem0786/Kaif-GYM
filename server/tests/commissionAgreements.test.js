import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import test, { after, before, beforeEach } from 'node:test'
import { createApp } from '../src/app.js'
import { AuditLog } from '../src/modules/audit/auditLog.model.js'
import { Admin } from '../src/modules/auth/admin.model.js'
import { bootstrapAdmin } from '../src/modules/auth/admin.service.js'
import { CommissionAgreement } from '../src/modules/commissions/commissionAgreement.model.js'
import { Trainer } from '../src/modules/trainers/trainer.model.js'

const authConfig = {
  JWT_SECRET: 'm8-agreement-test-secret-with-at-least-thirty-two-characters',
  JWT_EXPIRES_IN: 3600,
  COOKIE_NAME: 'gym_admin_session',
  COOKIE_SECURE: false,
  COOKIE_SAME_SITE: 'lax',
}
const adminCredentials = {
  name: 'Commission Agreement Test Admin',
  email: 'commission-agreements-admin@example.test',
  password: 'M8-Commission-Agreement-Test-Password',
}

function createTestApp() {
  return createApp({
    allowedOrigins: ['http://localhost:5173'],
    getDatabaseState: () => 'connected',
    authConfig,
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

async function createTrainer(baseUrl, cookie) {
  const response = await fetch(`${baseUrl}/api/v1/trainers`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({
      firstName: 'Nadia',
      lastName: 'Khan',
      phone: '98765 43210',
      joiningDate: '2025-01-02',
    }),
  })
  assert.equal(response.status, 201)
  return (await response.json()).data.trainer
}

async function createAgreement(baseUrl, cookie, trainerId, overrides = {}) {
  return fetch(
    `${baseUrl}/api/v1/commission-agreements/trainers/${trainerId}`,
    {
      method: 'POST',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        commissionBasis: 'membership_fee',
        effectiveFrom: '2026-01-01',
        ...overrides,
      }),
    },
  )
}

before(async () => {
  const testUri = new URL(
    process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/kaifs_gym_test',
  )
  testUri.pathname = `/gym_m8_agreements_${process.pid}_${randomUUID().replaceAll('-', '')}`
  await mongoose.connect(testUri.toString(), { serverSelectionTimeoutMS: 5000 })
  await Promise.all([
    Admin.init(),
    Trainer.init(),
    CommissionAgreement.init(),
    AuditLog.init(),
  ])
  await bootstrapAdmin(adminCredentials)
})

beforeEach(async () => {
  await Promise.all([
    Trainer.collection.deleteMany({}),
    CommissionAgreement.collection.deleteMany({}),
    AuditLog.collection.deleteMany({}),
  ])
})

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
  }
  await mongoose.disconnect()
})

test('admin can create versions, list history, and retrieve agreement details', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const trainer = await createTrainer(baseUrl, cookie)

    const firstResponse = await createAgreement(baseUrl, cookie, trainer._id, {
      effectiveTo: '2026-06-30',
    })
    assert.equal(firstResponse.status, 201)
    const first = (await firstResponse.json()).data.agreement
    assert.equal(first.agreementVersion, 1)
    assert.equal(first.commissionBasis, 'membership_fee')
    assert.equal(new Date(first.effectiveFrom).toISOString(), '2026-01-01T00:00:00.000Z')
    assert.equal(new Date(first.effectiveTo).toISOString(), '2026-06-30T00:00:00.000Z')

    const secondResponse = await createAgreement(baseUrl, cookie, trainer._id, {
      commissionBasis: 'received_payment',
      effectiveFrom: '2026-07-01',
      effectiveTo: null,
    })
    assert.equal(secondResponse.status, 201)
    const second = (await secondResponse.json()).data.agreement
    assert.equal(second.agreementVersion, 2)
    assert.equal(second.commissionBasis, 'received_payment')
    assert.equal(second.effectiveTo, null)

    const anotherTrainer = await createTrainer(baseUrl, cookie)
    const independentResponse = await createAgreement(
      baseUrl,
      cookie,
      anotherTrainer._id,
    )
    assert.equal(independentResponse.status, 201)
    const independent = (await independentResponse.json()).data.agreement
    assert.equal(independent.agreementVersion, 1)
    assert.equal(independent.trainer, anotherTrainer._id)

    const listResponse = await fetch(
      `${baseUrl}/api/v1/commission-agreements/trainers/${trainer._id}?page=1&limit=1`,
      { headers: { Cookie: cookie } },
    )
    const list = await listResponse.json()
    assert.equal(listResponse.status, 200)
    assert.equal(list.data.agreements.length, 1)
    assert.equal(list.data.agreements[0].agreementVersion, 2)
    assert.deepEqual(list.data.pagination, { page: 1, limit: 1, total: 2, totalPages: 2 })

    const detailsResponse = await fetch(
      `${baseUrl}/api/v1/commission-agreements/${first._id}`,
      { headers: { Cookie: cookie } },
    )
    const details = await detailsResponse.json()
    assert.equal(detailsResponse.status, 200)
    assert.equal(details.data.agreement.agreementVersion, 1)
    assert.equal(details.data.agreement.commissionBasis, 'membership_fee')
    assert.equal(details.data.agreement.trainer._id, trainer._id)

    const savedFirst = await CommissionAgreement.findById(first._id).lean()
    assert.equal(savedFirst.commissionBasis, 'membership_fee')
    assert.equal(savedFirst.effectiveTo.toISOString(), '2026-06-30T00:00:00.000Z')
  })
})

test('agreement creation rejects invalid basis, dates, extra fields, and missing trainers', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const trainer = await createTrainer(baseUrl, cookie)
    const invalidRequests = [
      { commissionBasis: 'cash', effectiveFrom: '2026-01-01' },
      { commissionBasis: 'membership_fee', effectiveFrom: '2026-02-30' },
      {
        commissionBasis: 'membership_fee',
        effectiveFrom: '2026-04-01',
        effectiveTo: '2026-03-31',
      },
      {
        commissionBasis: 'membership_fee',
        effectiveFrom: '2026-01-01',
        commissionValue: 20,
      },
    ]

    for (const body of invalidRequests) {
      const response = await createAgreement(baseUrl, cookie, trainer._id, body)
      assert.equal(response.status, 400)
    }

    const invalidTrainer = new mongoose.Types.ObjectId().toString()
    const missingTrainerResponse = await createAgreement(baseUrl, cookie, invalidTrainer)
    assert.equal(missingTrainerResponse.status, 404)
    assert.equal(await CommissionAgreement.countDocuments({}), 0)
  })
})

test('agreement APIs require an authenticated admin and write append-only audit records', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const trainer = await Trainer.create({
      trainerCode: `BAT-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
      firstName: 'Nadia',
      lastName: 'Khan',
      phone: '+919876543210',
      joiningDate: new Date('2025-01-02T00:00:00.000Z'),
    })
    const unauthorizedList = await fetch(
      `${baseUrl}/api/v1/commission-agreements/trainers/${trainer._id}`,
    )
    assert.equal(unauthorizedList.status, 401)
    const unauthorizedCreate = await createAgreement(
      baseUrl,
      '',
      trainer._id,
    )
    assert.equal(unauthorizedCreate.status, 401)

    const cookie = await login(baseUrl)
    const response = await createAgreement(baseUrl, cookie, trainer._id)
    assert.equal(response.status, 201)
    const agreement = (await response.json()).data.agreement
    const audit = await AuditLog.findOne({ entityId: agreement._id }).lean()
    assert.equal(audit.action, 'commissionAgreement.created')
    assert.equal(audit.module, 'commissions')
    assert.equal(audit.newData.commissionBasis, 'membership_fee')

    const updateResponse = await fetch(
      `${baseUrl}/api/v1/commission-agreements/${agreement._id}`,
      {
        method: 'PATCH',
        headers: jsonHeaders(cookie),
        body: JSON.stringify({ commissionBasis: 'received_payment' }),
      },
    )
    const deleteResponse = await fetch(
      `${baseUrl}/api/v1/commission-agreements/${agreement._id}`,
      { method: 'DELETE', headers: { Cookie: cookie } },
    )
    assert.equal(updateResponse.status, 404)
    assert.equal(deleteResponse.status, 404)

    await assert.rejects(
      CommissionAgreement.updateOne(
        { _id: agreement._id },
        { $set: { commissionBasis: 'received_payment' } },
      ),
      /immutable/,
    )
    await assert.rejects(
      CommissionAgreement.findById(agreement._id).then((document) => document.deleteOne()),
      /immutable/,
    )
    const unchanged = await CommissionAgreement.findById(agreement._id).lean()
    assert.equal(unchanged.commissionBasis, 'membership_fee')
  })
})

test('agreement list and details report missing records with consistent 404 responses', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const missingTrainerId = new mongoose.Types.ObjectId().toString()
    const missingTrainerResponse = await fetch(
      `${baseUrl}/api/v1/commission-agreements/trainers/${missingTrainerId}`,
      { headers: { Cookie: cookie } },
    )
    assert.equal(missingTrainerResponse.status, 404)

    const missingAgreementId = new mongoose.Types.ObjectId().toString()
    const missingAgreementResponse = await fetch(
      `${baseUrl}/api/v1/commission-agreements/${missingAgreementId}`,
      { headers: { Cookie: cookie } },
    )
    assert.equal(missingAgreementResponse.status, 404)
  })
})
