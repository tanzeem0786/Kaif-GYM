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
import { addMonthsUtc } from '../src/modules/memberships/membership.service.js'

const authConfig = {
  JWT_SECRET: 'm5-membership-test-secret-with-at-least-thirty-two-characters',
  JWT_EXPIRES_IN: 3600,
  COOKIE_NAME: 'gym_admin_session',
  COOKIE_SECURE: false,
  COOKIE_SAME_SITE: 'lax',
}
const adminCredentials = {
  name: 'Membership Test Admin',
  email: 'membership-admin@example.test',
  password: 'M5-Membership-Test-Admin-Password',
}

let admin

function createTestApp() {
  return createApp({
    allowedOrigins: ['http://localhost:5173'],
    getDatabaseState: () => 'connected',
    authConfig,
    AdminModel: Admin,
    MemberModel: Member,
    MembershipModel: Membership,
    MembershipPlanModel: MembershipPlan,
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

async function createMemberRecord() {
  return Member.create({
    memberCode: `KG-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
    firstName: 'Amina',
    lastName: 'Rahman',
    phone: '+919876543210',
  })
}

async function createPlan(baseUrl, cookie, overrides = {}) {
  return fetch(`${baseUrl}/api/v1/membership-plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      name: 'Monthly',
      durationMonths: 1,
      pricePaise: 300000,
      description: '',
      ...overrides,
    }),
  })
}

async function assignMembership(baseUrl, cookie, memberId, planId, startDate = '2026-11-01') {
  return fetch(`${baseUrl}/api/v1/memberships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ memberId, planId, startDate }),
  })
}

before(async () => {
  const testUri = new URL(
    process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/kaif_gym_test',
  )
  testUri.pathname = `/gym_m5_${process.pid}_${randomUUID().replaceAll('-', '')}`
  await mongoose.connect(testUri.toString(), { serverSelectionTimeoutMS: 5000 })
  await Promise.all([
    Admin.init(),
    Member.init(),
    Membership.init(),
    MembershipPlan.init(),
    AuditLog.init(),
  ])
  await bootstrapAdmin(adminCredentials, Admin)
  admin = await Admin.findOne({ email: adminCredentials.email })
})

beforeEach(async () => {
  await Promise.all([
    Member.deleteMany({}),
    Membership.deleteMany({}),
    MembershipPlan.deleteMany({}),
    AuditLog.collection.deleteMany({}),
  ])
})

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
  }
  await mongoose.disconnect()
})

test('membership plans validate duration and integer-paise price', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const [invalidDuration, negativePrice, fractionalPrice] = await Promise.all(
      [
        { durationMonths: 2 },
        { pricePaise: -1 },
        { pricePaise: 1250.5 },
      ].map((values) => createPlan(baseUrl, cookie, values)),
    )
    assert.equal(invalidDuration.status, 400)
    assert.equal(negativePrice.status, 400)
    assert.equal(fractionalPrice.status, 400)
    assert.equal(await MembershipPlan.countDocuments(), 0)
  })
})

test('all supported durations can be created as plans', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    for (const [index, durationMonths] of [1, 3, 6, 12].entries()) {
      const response = await createPlan(baseUrl, cookie, {
        name: `Plan ${durationMonths}`,
        durationMonths,
        pricePaise: index * 100,
      })
      assert.equal(response.status, 201)
      assert.equal((await response.json()).data.plan.durationMonths, durationMonths)
    }
  })
})

test('calendar-month expiry calculation supports all approved durations and month ends', () => {
  const start = new Date('2024-01-31T00:00:00.000Z')
  const expectedExpiry = [
    '2024-02-29T00:00:00.000Z',
    '2024-04-30T00:00:00.000Z',
    '2024-07-31T00:00:00.000Z',
    '2025-01-31T00:00:00.000Z',
  ]
  for (const [index, durationMonths] of [1, 3, 6, 12].entries()) {
    assert.equal(addMonthsUtc(start, durationMonths).toISOString(), expectedExpiry[index])
  }
})

test('admin can create, list, update and safely deactivate a plan with audit history', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const createResponse = await createPlan(baseUrl, cookie)
    const created = await createResponse.json()
    assert.equal(createResponse.status, 201)
    assert.equal(created.data.plan.pricePaise, 300000)

    const updateResponse = await fetch(
      `${baseUrl}/api/v1/membership-plans/${created.data.plan._id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ pricePaise: 320000, name: 'Standard Monthly' }),
      },
    )
    assert.equal(updateResponse.status, 200)
    assert.equal((await updateResponse.json()).data.plan.pricePaise, 320000)

    const listResponse = await fetch(
      `${baseUrl}/api/v1/membership-plans?isActive=true&durationMonths=1&search=standard`,
      { headers: { Cookie: cookie } },
    )
    const listed = await listResponse.json()
    assert.equal(listResponse.status, 200)
    assert.equal(listed.data.plans.length, 1)

    const deactivateResponse = await fetch(
      `${baseUrl}/api/v1/membership-plans/${created.data.plan._id}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ isActive: false }),
      },
    )
    assert.equal(deactivateResponse.status, 200)
    assert.equal((await deactivateResponse.json()).data.plan.isActive, false)

    const deleteResponse = await fetch(
      `${baseUrl}/api/v1/membership-plans/${created.data.plan._id}`,
      { method: 'DELETE', headers: { Cookie: cookie } },
    )
    assert.equal(deleteResponse.status, 404)
    assert.equal(await MembershipPlan.countDocuments(), 1)
    assert.deepEqual(
      (await AuditLog.find({ module: 'membershipPlans' }).sort({ createdAt: 1 }).lean()).map(
        ({ action }) => action,
      ),
      ['membershipPlan.created', 'membershipPlan.updated', 'membershipPlan.deactivated'],
    )
  })
})

test('only approved durations can be used and a membership snapshots plan price', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const member = await createMemberRecord()
    const createPlanResponse = await createPlan(baseUrl, cookie, {
      durationMonths: 3,
      pricePaise: 450000,
    })
    const plan = (await createPlanResponse.json()).data.plan
    const response = await assignMembership(baseUrl, cookie, member.id, plan._id, '2026-11-30')
    const body = await response.json()

    assert.equal(response.status, 201)
    assert.equal(body.data.membership.planSnapshot.durationMonths, 3)
    assert.equal(body.data.membership.planSnapshot.pricePaise, 450000)
    assert.equal(body.data.membership.totalFeePaise, 450000)
    assert.equal(body.data.membership.amountPaidPaise, 0)
    assert.equal(body.data.membership.outstandingBalancePaise, 450000)
    assert.equal(body.data.membership.startDate, '2026-11-30T00:00:00.000Z')
    assert.equal(body.data.membership.expiryDate, '2027-02-28T00:00:00.000Z')

    await MembershipPlan.updateOne({ _id: plan._id }, { $set: { pricePaise: 500000 } })
    const membership = await Membership.findById(body.data.membership._id).lean()
    assert.equal(membership.planSnapshot.pricePaise, 450000)
    assert.equal(membership.totalFeePaise, 450000)
  })
})

test('membership assignment rejects invalid member, invalid dates and inactive plans', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const member = await createMemberRecord()
    const planResponse = await createPlan(baseUrl, cookie)
    const plan = (await planResponse.json()).data.plan
    const invalidDate = await assignMembership(baseUrl, cookie, member.id, plan._id, '2026-02-30')
    assert.equal(invalidDate.status, 400)

    const invalidMember = await assignMembership(
      baseUrl,
      cookie,
      '0123456789abcdef01234567',
      plan._id,
    )
    assert.equal((await invalidMember.json()).message, 'Member not found')
    await MembershipPlan.updateOne({ _id: plan._id }, { $set: { isActive: false } })
    const inactivePlan = await assignMembership(baseUrl, cookie, member.id, plan._id)
    assert.equal(inactivePlan.status, 409)
    assert.equal(await Membership.countDocuments(), 0)
  })
})

test('duplicate initial membership assignment is rejected and audited once', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const member = await createMemberRecord()
    const planResponse = await createPlan(baseUrl, cookie)
    const plan = (await planResponse.json()).data.plan
    const responses = await Promise.all([
      assignMembership(baseUrl, cookie, member.id, plan._id),
      assignMembership(baseUrl, cookie, member.id, plan._id),
    ])
    assert.deepEqual(
      responses.map((response) => response.status).sort(),
      [201, 409],
    )
    assert.equal(await Membership.countDocuments({ member: member._id }), 1)
    assert.equal(await AuditLog.countDocuments({ action: 'membership.assigned' }), 1)
  })
})

test('early renewal starts exactly at the prior exclusive expiry and preserves history', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const member = await createMemberRecord()
    const planResponse = await createPlan(baseUrl, cookie, { durationMonths: 1 })
    const originalPlan = (await planResponse.json()).data.plan
    const initialResponse = await assignMembership(
      baseUrl,
      cookie,
      member.id,
      originalPlan._id,
      '2099-01-31',
    )
    const original = (await initialResponse.json()).data.membership

    const renewalPlanResponse = await createPlan(baseUrl, cookie, {
      name: 'Quarterly',
      durationMonths: 3,
      pricePaise: 800000,
    })
    const renewalPlan = (await renewalPlanResponse.json()).data.plan
    const renewalResponse = await fetch(
      `${baseUrl}/api/v1/memberships/${original._id}/renew`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ planId: renewalPlan._id, startDate: '2099-01-01' }),
      },
    )
    const renewal = (await renewalResponse.json()).data.membership
    assert.equal(renewalResponse.status, 201)
    assert.equal(renewal.startDate, original.expiryDate)
    assert.equal(renewal.expiryDate, '2099-05-28T00:00:00.000Z')
    assert.equal(renewal.renewalOf, original._id)
    assert.equal(await Membership.countDocuments({ member: member._id }), 2)
    assert.ok(await Membership.findById(original._id))
    assert.ok(await AuditLog.findOne({ action: 'membership.renewed' }))
  })
})

test('renewal after expiry honors an admin-selected start date and rejects a second renewal', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const member = await createMemberRecord()
    const planResponse = await createPlan(baseUrl, cookie)
    const plan = (await planResponse.json()).data.plan
    const initialResponse = await assignMembership(
      baseUrl,
      cookie,
      member.id,
      plan._id,
      '2020-01-01',
    )
    const initial = (await initialResponse.json()).data.membership
    const renewalResponse = await fetch(
      `${baseUrl}/api/v1/memberships/${initial._id}/renew`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ planId: plan._id, startDate: '2026-12-15' }),
      },
    )
    const renewed = (await renewalResponse.json()).data.membership
    assert.equal(renewalResponse.status, 201)
    assert.equal(renewed.startDate, '2026-12-15T00:00:00.000Z')

    const duplicateResponse = await fetch(
      `${baseUrl}/api/v1/memberships/${initial._id}/renew`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ planId: plan._id }),
      },
    )
    assert.equal(duplicateResponse.status, 409)
    assert.equal(await Membership.countDocuments({ member: member._id }), 2)
  })
})

test('renewal start is clamped to the previous expiry when an earlier date is requested', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const member = await createMemberRecord()
    const planResponse = await createPlan(baseUrl, cookie)
    const plan = (await planResponse.json()).data.plan
    const assignment = await assignMembership(
      baseUrl,
      cookie,
      member.id,
      plan._id,
      '2020-10-15',
    )
    const previous = (await assignment.json()).data.membership
    const response = await fetch(
      `${baseUrl}/api/v1/memberships/${previous._id}/renew`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ planId: plan._id, startDate: '2020-11-01' }),
      },
    )
    const renewed = (await response.json()).data.membership
    assert.equal(response.status, 201)
    assert.equal(renewed.startDate, previous.expiryDate)
  })
})

test('inactive and frozen memberships cannot be renewed', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const planResponse = await createPlan(baseUrl, cookie)
    const plan = (await planResponse.json()).data.plan
    for (const [index, status] of ['inactive', 'frozen'].entries()) {
      const member = await createMemberRecord()
      const assignment = await assignMembership(
        baseUrl,
        cookie,
        member.id,
        plan._id,
        `2099-01-0${index + 1}`,
      )
      const membership = (await assignment.json()).data.membership
      await Membership.updateOne({ _id: membership._id }, { $set: { status } })
      const response = await fetch(
        `${baseUrl}/api/v1/memberships/${membership._id}/renew`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({ planId: plan._id }),
        },
      )
      assert.equal(response.status, 409)
    }
  })
})

test('membership list supports search, filters, pagination and member history', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const member = await createMemberRecord()
    const firstPlanResponse = await createPlan(baseUrl, cookie)
    const firstPlan = (await firstPlanResponse.json()).data.plan
    const firstResponse = await assignMembership(baseUrl, cookie, member.id, firstPlan._id)
    const first = (await firstResponse.json()).data.membership
    const secondPlanResponse = await createPlan(baseUrl, cookie, {
      name: 'Quarterly',
      durationMonths: 3,
    })
    const secondPlan = (await secondPlanResponse.json()).data.plan
    await fetch(`${baseUrl}/api/v1/memberships/${first._id}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ planId: secondPlan._id }),
    })

    const listResponse = await fetch(
      `${baseUrl}/api/v1/memberships?search=Amina&memberId=${member.id}&status=active&page=1&limit=1`,
      { headers: { Cookie: cookie } },
    )
    const listed = await listResponse.json()
    assert.equal(listResponse.status, 200)
    assert.equal(listed.data.memberships.length, 1)
    assert.equal(listed.data.pagination.total, 2)
    const historyResponse = await fetch(
      `${baseUrl}/api/v1/memberships/member/${member.id}`,
      { headers: { Cookie: cookie } },
    )
    assert.equal((await historyResponse.json()).data.memberships.length, 2)
  })
})

test('expired memberships synchronize to expired and create a system audit record', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const member = await createMemberRecord()
    const planResponse = await createPlan(baseUrl, cookie)
    const plan = (await planResponse.json()).data.plan
    const assignment = await assignMembership(
      baseUrl,
      cookie,
      member.id,
      plan._id,
      '2020-01-01',
    )
    const membership = (await assignment.json()).data.membership
    const listResponse = await fetch(
      `${baseUrl}/api/v1/memberships?status=expired`,
      { headers: { Cookie: cookie } },
    )
    assert.equal(listResponse.status, 200)
    assert.equal((await listResponse.json()).data.memberships.length, 1)
    assert.equal((await Membership.findById(membership._id)).status, 'expired')
    const log = await AuditLog.findOne({
      entityId: membership._id,
      action: 'membership.expired',
    }).lean()
    assert.equal(log.actorType, 'system')
    assert.equal(log.actor, undefined)

    const summaryResponse = await fetch(`${baseUrl}/api/v1/memberships/summary`, {
      headers: { Cookie: cookie },
    })
    const summary = await summaryResponse.json()
    assert.equal(summary.data.activeMemberships, 0)
    assert.equal(summary.data.expiredMemberships, 1)
    assert.equal(summary.data.activePlans, 1)
  })
})

test('membership list rejects invalid query values and invalid member route IDs', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const [invalidQuery, invalidMemberId] = await Promise.all([
      fetch(`${baseUrl}/api/v1/memberships?limit=101&status=unknown`, {
        headers: { Cookie: cookie },
      }),
      fetch(`${baseUrl}/api/v1/memberships/member/not-an-object-id`, {
        headers: { Cookie: cookie },
      }),
    ])
    assert.equal(invalidQuery.status, 400)
    assert.equal(invalidMemberId.status, 400)
  })
})

test('plan and membership APIs require an authenticated admin', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/api/v1/membership-plans`),
      fetch(`${baseUrl}/api/v1/membership-plans`, { method: 'POST' }),
      fetch(`${baseUrl}/api/v1/memberships`),
      fetch(`${baseUrl}/api/v1/memberships/0123456789abcdef01234567`),
    ])
    for (const response of responses) {
      assert.equal(response.status, 401)
      assert.equal((await response.json()).success, false)
    }
  })
})
