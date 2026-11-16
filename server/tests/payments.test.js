import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import test, { after, before, beforeEach } from 'node:test'
import { createApp } from '../src/app.js'
import { AuditLog } from '../src/modules/audit/auditLog.model.js'
import { Admin } from '../src/modules/auth/admin.model.js'
import { bootstrapAdmin } from '../src/modules/auth/admin.service.js'
import { Member } from '../src/modules/members/member.model.js'
import { Membership } from '../src/modules/memberships/models/membership.model.js'
import { MembershipPlan } from '../src/modules/memberships/models/membershipPlan.model.js'
import { Payment } from '../src/modules/payments/payment.model.js'

const authConfig = {
  JWT_SECRET: 'm7-payment-test-secret-with-at-least-thirty-two-characters',
  JWT_EXPIRES_IN: 3600,
  COOKIE_NAME: 'gym_admin_session',
  COOKIE_SECURE: false,
  COOKIE_SAME_SITE: 'lax',
}
const adminCredentials = {
  name: 'Payment Test Admin',
  email: 'payment-admin@example.test',
  password: 'M7-Payment-Test-Admin-Password',
}
const totalFeePaise = 125000

let admin

function createTestApp() {
  return createApp({
    allowedOrigins: ['http://localhost:5173'],
    getDatabaseState: () => 'connected',
    authConfig,
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

async function createBillingRecords() {
  const member = await Member.create({
    memberCode: 'BA0001',
    fullName: 'Amina Rahman',
    fatherName: 'Nadeem Rahman',
    phone: '+919876543210',
  })
  const plan = await MembershipPlan.create({
    name: 'Payment Test Plan',
    durationMonths: 1,
    pricePaise: totalFeePaise,
    isActive: true,
  })
  const membership = await Membership.create({
    membershipCode: `BAM-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`,
    member: member._id,
    plan: plan._id,
    planSnapshot: {
      name: plan.name,
      durationMonths: plan.durationMonths,
      pricePaise: plan.pricePaise,
    },
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    expiryDate: new Date('2026-02-01T00:00:00.000Z'),
    originalExpiryDate: new Date('2026-02-01T00:00:00.000Z'),
    totalFeePaise,
    amountPaidPaise: 0,
    outstandingBalancePaise: totalFeePaise,
    status: 'active',
  })
  return { member, plan, membership }
}

async function recordPayment(baseUrl, cookie, membershipId, overrides = {}) {
  return fetch(`${baseUrl}/api/v1/payments`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({
      membershipId,
      amountPaise: 40000,
      paymentMethod: 'upi',
      paymentDate: '2026-01-15',
      referenceNumber: 'UPI-REFERENCE-001',
      idempotencyKey: `payment-${randomUUID()}`,
      ...overrides,
    }),
  })
}

async function reversePayment(baseUrl, cookie, paymentId, overrides = {}) {
  return fetch(`${baseUrl}/api/v1/payments/${paymentId}/reversals`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({
      amountPaise: 10000,
      paymentDate: '2026-01-16',
      idempotencyKey: `reversal-${randomUUID()}`,
      ...overrides,
    }),
  })
}

before(async () => {
  const testUri = new URL(
    process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/kaifs_gym_test',
  )
  testUri.pathname = `/gym_m7_${process.pid}_${randomUUID().replaceAll('-', '')}`
  await mongoose.connect(testUri.toString(), { serverSelectionTimeoutMS: 5000 })
  await Promise.all([
    Admin.init(),
    Member.init(),
    MembershipPlan.init(),
    Membership.init(),
    Payment.init(),
    AuditLog.init(),
  ])
  await bootstrapAdmin(adminCredentials)
  admin = await Admin.findOne({ email: adminCredentials.email })
})

beforeEach(async () => {
  await Promise.all([
    Member.deleteMany({}),
    MembershipPlan.deleteMany({}),
    Membership.deleteMany({}),
    Payment.deleteMany({}),
    AuditLog.collection.deleteMany({}),
  ])
})

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
  }
  await mongoose.disconnect()
})

test('records partial and full payments and reconciles membership balances', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const { member, membership } = await createBillingRecords()
    const partialResponse = await recordPayment(baseUrl, cookie, membership.id)
    const partial = (await partialResponse.json()).data.payment
    assert.equal(partialResponse.status, 201)
    assert.match(partial.transactionCode, /^BAP-[A-F0-9]{16}$/)
    assert.equal(partial.amountPaise, 40000)
    assert.equal(partial.paymentMethod, 'upi')

    const fullResponse = await recordPayment(baseUrl, cookie, membership.id, {
      amountPaise: 85000,
      paymentMethod: 'cash',
      referenceNumber: null,
      idempotencyKey: `payment-${randomUUID()}`,
    })
    assert.equal(fullResponse.status, 201)
    const updated = await Membership.findById(membership._id).lean()
    assert.equal(updated.amountPaidPaise, totalFeePaise)
    assert.equal(updated.outstandingBalancePaise, 0)
    assert.equal(await Payment.countDocuments({ member: member._id, type: 'payment' }), 2)
    assert.equal(await AuditLog.countDocuments({ module: 'payments', action: 'payment.recorded' }), 2)
  })
})

test('validates payment method, positive integer-paise amounts, and outstanding cap', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const { membership } = await createBillingRecords()
    const [zero, fractional, invalidMethod, cashReference] = await Promise.all([
      recordPayment(baseUrl, cookie, membership.id, { amountPaise: 0 }),
      recordPayment(baseUrl, cookie, membership.id, { amountPaise: 1.5 }),
      recordPayment(baseUrl, cookie, membership.id, { paymentMethod: 'card' }),
      recordPayment(baseUrl, cookie, membership.id, { paymentMethod: 'cash', referenceNumber: 'ref' }),
    ])
    assert.deepEqual(
      [zero.status, fractional.status, invalidMethod.status, cashReference.status],
      [400, 400, 400, 400],
    )
    const overpayment = await recordPayment(baseUrl, cookie, membership.id, {
      amountPaise: totalFeePaise + 1,
    })
    assert.equal(overpayment.status, 409)
    assert.equal(await Payment.countDocuments(), 0)
    assert.equal((await Membership.findById(membership._id)).amountPaidPaise, 0)
  })
})

test('restores the membership balance when payment persistence fails', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const { membership } = await createBillingRecords()
    const originalSave = Payment.prototype.save
    Payment.prototype.save = async function (...args) {
      if (this.type === 'payment') throw new Error('forced payment save failure')
      return originalSave.apply(this, args)
    }

    let response
    try {
      response = await recordPayment(baseUrl, cookie, membership.id)
    } finally {
      Payment.prototype.save = originalSave
    }

    assert.equal(response.status, 500)
    const updated = await Membership.findById(membership._id).lean()
    assert.equal(updated.amountPaidPaise, 0)
    assert.equal(updated.outstandingBalancePaise, totalFeePaise)
    assert.equal(await Payment.countDocuments(), 0)
    assert.equal(await AuditLog.countDocuments({ module: 'payments' }), 0)
  })
})

test('idempotent retry returns the original payment and conflicting reuse is rejected', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const { membership } = await createBillingRecords()
    const idempotencyKey = `payment-${randomUUID()}`
    const requests = await Promise.all([
      recordPayment(baseUrl, cookie, membership.id, { idempotencyKey }),
      recordPayment(baseUrl, cookie, membership.id, { idempotencyKey }),
    ])
    const results = await Promise.all(requests.map((response) => response.json()))
    assert.deepEqual(requests.map((response) => response.status).sort(), [200, 201])
    assert.equal(results[0].data.payment._id, results[1].data.payment._id)
    assert.equal(await Payment.countDocuments({ idempotencyKey }), 1)
    assert.equal((await Membership.findById(membership._id)).amountPaidPaise, 40000)

    const changedRequest = await recordPayment(baseUrl, cookie, membership.id, {
      idempotencyKey,
      amountPaise: 10000,
    })
    assert.equal(changedRequest.status, 409)
    assert.equal(await Payment.countDocuments({ idempotencyKey }), 1)
  })
})

test('partial reversals may accumulate to a full reversal and preserve linked history', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const { member, membership } = await createBillingRecords()
    const paymentResponse = await recordPayment(baseUrl, cookie, membership.id)
    const payment = (await paymentResponse.json()).data.payment

    const firstResponse = await reversePayment(baseUrl, cookie, payment._id, { amountPaise: 10000 })
    const first = (await firstResponse.json()).data.payment
    assert.equal(firstResponse.status, 201)
    assert.equal(first.type, 'reversal')
    assert.equal(first.reversalOf, payment._id)
    const correctionReceiptResponse = await fetch(
      `${baseUrl}/api/v1/payments/${first._id}/receipt`,
      { headers: { Cookie: cookie } },
    )
    const correctionReceipt = await correctionReceiptResponse.json()
    assert.equal(correctionReceiptResponse.status, 200)
    assert.equal(correctionReceipt.data.payment._id, payment._id)
    assert.equal(correctionReceipt.data.requestedCorrection._id, first._id)
    assert.equal(correctionReceipt.data.reversals.length, 1)
    let updated = await Membership.findById(membership._id).lean()
    assert.equal(updated.amountPaidPaise, 30000)
    assert.equal(updated.outstandingBalancePaise, totalFeePaise - 30000)
    assert.equal((await Payment.findById(payment._id)).status, 'completed')

    const secondResponse = await reversePayment(baseUrl, cookie, payment._id, { amountPaise: 15000 })
    assert.equal(secondResponse.status, 201)
    const finalReversalKey = `reversal-${randomUUID()}`
    const thirdResponse = await reversePayment(baseUrl, cookie, payment._id, {
      amountPaise: 15000,
      idempotencyKey: finalReversalKey,
    })
    assert.equal(thirdResponse.status, 201)
    const fullyReversed = await Payment.findById(payment._id).lean()
    assert.equal(fullyReversed.status, 'reversed')
    assert.equal(fullyReversed.reversedAmountPaise, 40000)
    const finalRetry = await reversePayment(baseUrl, cookie, payment._id, {
      amountPaise: 15000,
      idempotencyKey: finalReversalKey,
    })
    assert.equal(finalRetry.status, 200)
    updated = await Membership.findById(membership._id).lean()
    assert.equal(updated.amountPaidPaise, 0)
    assert.equal(updated.outstandingBalancePaise, totalFeePaise)

    const furtherReversal = await reversePayment(baseUrl, cookie, payment._id, { amountPaise: 1 })
    assert.equal(furtherReversal.status, 409)
    assert.equal(await Payment.countDocuments({ reversalOf: payment._id }), 3)
    assert.equal(await Payment.countDocuments({ member: member._id }), 4)
    assert.equal(await AuditLog.countDocuments({ action: 'payment.reversed' }), 3)
    assert.equal((await AuditLog.find({ module: 'payments' }).countDocuments()), 4)
  })
})

test('reversal cannot exceed remaining amount and duplicate corrections are idempotent', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const { membership } = await createBillingRecords()
    const payment = (await (await recordPayment(baseUrl, cookie, membership.id)).json()).data.payment
    const idempotencyKey = `reversal-${randomUUID()}`
    const requests = await Promise.all([
      reversePayment(baseUrl, cookie, payment._id, { amountPaise: 12000, idempotencyKey }),
      reversePayment(baseUrl, cookie, payment._id, { amountPaise: 12000, idempotencyKey }),
    ])
    assert.ok(requests.every((response) => [200, 201, 409].includes(response.status)))
    assert.ok(requests.some((response) => [200, 201].includes(response.status)))
    assert.equal(await Payment.countDocuments({ reversalOf: payment._id }), 1)
    const retry = await reversePayment(baseUrl, cookie, payment._id, {
      amountPaise: 12000,
      idempotencyKey,
    })
    assert.equal(retry.status, 200)

    const tooMuch = await reversePayment(baseUrl, cookie, payment._id, { amountPaise: 28001 })
    assert.equal(tooMuch.status, 409)
    const updated = await Membership.findById(membership._id).lean()
    assert.equal(updated.amountPaidPaise, 28000)
    assert.equal(updated.outstandingBalancePaise, totalFeePaise - 28000)
  })
})

test('restores payment and balance when reversal persistence fails', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const { membership } = await createBillingRecords()
    const payment = (await (await recordPayment(baseUrl, cookie, membership.id)).json()).data.payment
    const originalSave = Payment.prototype.save
    Payment.prototype.save = async function (...args) {
      if (this.type === 'reversal') throw new Error('forced reversal save failure')
      return originalSave.apply(this, args)
    }

    let response
    try {
      response = await reversePayment(baseUrl, cookie, payment._id)
    } finally {
      Payment.prototype.save = originalSave
    }

    assert.equal(response.status, 500)
    const original = await Payment.findById(payment._id).lean()
    assert.equal(original.status, 'completed')
    assert.equal(original.reversedAmountPaise, 0)
    const updated = await Membership.findById(membership._id).lean()
    assert.equal(updated.amountPaidPaise, 40000)
    assert.equal(updated.outstandingBalancePaise, totalFeePaise - 40000)
    assert.equal(await Payment.countDocuments({ reversalOf: payment._id }), 0)
    assert.equal(await AuditLog.countDocuments({ action: 'payment.reversed' }), 0)
  })
})

test('payment listing, member history, details, receipt and authorization are protected', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const { member, membership } = await createBillingRecords()
    const payment = (await (await recordPayment(baseUrl, cookie, membership.id)).json()).data.payment

    const listResponse = await fetch(
      `${baseUrl}/api/v1/payments?paymentMethod=upi&fromDate=2026-01-15&toDate=2026-01-15&search=Nadeem`,
      { headers: { Cookie: cookie } },
    )
    const listed = await listResponse.json()
    assert.equal(listResponse.status, 200)
    assert.equal(listed.data.payments.length, 1)
    assert.equal(listed.data.payments[0].member.fullName, 'Amina Rahman')
    assert.equal(listed.data.payments[0].member.fatherName, 'Nadeem Rahman')

    const historyResponse = await fetch(
      `${baseUrl}/api/v1/payments/member/${member.id}`,
      { headers: { Cookie: cookie } },
    )
    assert.equal((await historyResponse.json()).data.payments.length, 1)
    const detailsResponse = await fetch(`${baseUrl}/api/v1/payments/${payment._id}`, {
      headers: { Cookie: cookie },
    })
    assert.equal(detailsResponse.status, 200)
    const detailsBody = await detailsResponse.json()
    assert.equal(detailsBody.data.payment.member.fullName, 'Amina Rahman')
    const updateResponse = await fetch(`${baseUrl}/api/v1/payments/${payment._id}`, {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ amountPaise: 1 }),
    })
    assert.equal(updateResponse.status, 404)
    const deleteResponse = await fetch(`${baseUrl}/api/v1/payments/${payment._id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
    assert.equal(deleteResponse.status, 404)
    assert.equal(await Payment.countDocuments({ _id: payment._id }), 1)
    const receiptResponse = await fetch(`${baseUrl}/api/v1/payments/${payment._id}/receipt`, {
      headers: { Cookie: cookie },
    })
    assert.equal(receiptResponse.status, 200)
    assert.equal((await receiptResponse.json()).data.payment.transactionCode, payment.transactionCode)

    const unauthorized = await fetch(`${baseUrl}/api/v1/payments`)
    assert.equal(unauthorized.status, 401)
  })
})
