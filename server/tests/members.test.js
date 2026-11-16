import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import test, { after, before, beforeEach } from 'node:test'
import { createApp } from '../src/app.js'
import { AuditLog } from '../src/modules/audit/auditLog.model.js'
import { TrainerAssignment } from '../src/modules/assignments/assignment.model.js'
import { Admin } from '../src/modules/auth/admin.model.js'
import { bootstrapAdmin } from '../src/modules/auth/admin.service.js'
import { Member } from '../src/modules/members/member.model.js'
import { Membership } from '../src/modules/memberships/models/membership.model.js'
import { MembershipPlan } from '../src/modules/memberships/models/membershipPlan.model.js'
import { Payment } from '../src/modules/payments/payment.model.js'
import { Trainer } from '../src/modules/trainers/trainer.model.js'

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
      fullName: 'Amina Rahman',
      fatherName: 'Nadeem Rahman',
      phone: '98765 43210',
      email: 'AMINA@example.test',
      ...overrides,
    }),
  })
}

async function createHistoricalRecords(
  member,
  { membershipStatus = 'expired', assignmentStatus = 'ended', includePayment = true } = {},
) {
  const plan = await MembershipPlan.create({
    name: 'Member history plan',
    durationMonths: 1,
    pricePaise: 10000,
  })
  const membership = await Membership.create({
    membershipCode: `BAM-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`,
    member: member._id,
    plan: plan._id,
    planSnapshot: { name: plan.name, durationMonths: 1, pricePaise: plan.pricePaise },
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    expiryDate: new Date('2025-02-01T00:00:00.000Z'),
    originalExpiryDate: new Date('2025-02-01T00:00:00.000Z'),
    totalFeePaise: 10000,
    amountPaidPaise: includePayment ? 10000 : 0,
    outstandingBalancePaise: includePayment ? 0 : 10000,
    status: membershipStatus,
  })
  const trainer = await Trainer.create({
    trainerCode: `BAT-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
    firstName: 'Nadia',
    lastName: 'Khan',
    phone: '+919876543211',
  })
  const assignment = await TrainerAssignment.create({
    member: member._id,
    trainer: trainer._id,
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    ...(assignmentStatus === 'ended' ? { endDate: new Date('2025-01-31T00:00:00.000Z') } : {}),
    status: assignmentStatus,
    proof: { url: 'https://files.example.test/member-proof.pdf', fileName: 'proof.pdf' },
  })

  let payment
  if (includePayment) {
    payment = await Payment.create({
      transactionCode: `BAP-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`,
      idempotencyKey: `member-test-${randomUUID()}`,
      requestFingerprint: randomUUID(),
      type: 'payment',
      member: member._id,
      membership: membership._id,
      amountPaise: 10000,
      paymentMethod: 'cash',
      paymentDate: new Date('2025-01-15T00:00:00.000Z'),
      status: 'completed',
      reversedAmountPaise: 0,
      recordedBy: admin._id,
    })
    await new AuditLog({
      actor: admin._id,
      action: 'payment.recorded',
      module: 'payments',
      entityId: payment._id,
      newData: { transactionCode: payment.transactionCode, amountPaise: payment.amountPaise },
      metadata: { memberId: member._id, membershipId: membership._id },
    }).save()
  }

  return { membership, assignment, payment }
}

before(async () => {
  const testUri = new URL(
    process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/kaifs_gym_members_test',
  )
  testUri.pathname = `/kaifs_gym_members_test_${process.pid}_${randomUUID().replaceAll('-', '')}`
  await mongoose.connect(testUri.toString(), { serverSelectionTimeoutMS: 5000 })
  await Promise.all([
    Admin.init(),
    Member.init(),
    AuditLog.init(),
    Membership.init(),
    MembershipPlan.init(),
    Payment.init(),
    Trainer.init(),
    TrainerAssignment.init(),
  ])
  await bootstrapAdmin(adminCredentials)
  admin = await Admin.findOne({ email: adminCredentials.email })
})

beforeEach(async () => {
  await Promise.all([
    Member.deleteMany({}),
    AuditLog.collection.deleteMany({}),
    Membership.deleteMany({}),
    MembershipPlan.deleteMany({}),
    Payment.deleteMany({}),
    Trainer.deleteMany({}),
    TrainerAssignment.deleteMany({}),
  ])
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
    assert.equal(body.data.member.memberCode, 'BA0001')
    assert.equal(body.data.member.phone, '+919876543210')
    assert.equal(body.data.member.email, 'amina@example.test')
    assert.equal(body.data.member.status, 'active')
    assert.equal(body.data.member.fullName, 'Amina Rahman')
    assert.equal(body.data.member.fatherName, 'Nadeem Rahman')
    assert.equal('firstName' in body.data.member, false)
    assert.equal('lastName' in body.data.member, false)
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

test('sequential member code allocation is collision-safe for concurrent creation', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const responses = await Promise.all([
      createMember(baseUrl, cookie),
      createMember(baseUrl, cookie, { fullName: 'Bilal Khan', phone: '9876543211' }),
    ])
    const createdMembers = await Promise.all(responses.map((response) => response.json()))

    assert.deepEqual(
      createdMembers.map((body) => body.data.member.memberCode).sort(),
      ['BA0001', 'BA0002'],
    )
    assert.equal(await Member.countDocuments({ memberCode: /^BA\d{4}$/ }), 2)
  })
})

test('historical member snapshots reserve codes after profile deletion', async () => {
  const deletedMemberId = new mongoose.Types.ObjectId()
  await TrainerAssignment.create({
    member: deletedMemberId,
    memberSnapshot: {
      memberId: deletedMemberId,
      memberCode: 'BA0042',
      fullName: 'Deleted Member',
      fatherName: 'Deleted Father',
    },
    trainer: new mongoose.Types.ObjectId(),
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    endDate: new Date('2025-01-31T00:00:00.000Z'),
    status: 'ended',
    proof: { url: 'https://files.example.test/proof.pdf', fileName: 'proof.pdf' },
  })

  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const response = await createMember(baseUrl, cookie)
    const body = await response.json()

    assert.equal(response.status, 201)
    assert.equal(body.data.member.memberCode, 'BA0043')
  })
})

test('member code sequence reports exhaustion at the six-character limit', async () => {
  await Member.create({
    memberCode: 'BA9999',
    fullName: 'Last Member',
    fatherName: 'Last Father',
    phone: '+919876543215',
  })

  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const response = await createMember(baseUrl, cookie)
    const body = await response.json()

    assert.equal(response.status, 409)
    assert.equal(body.message, 'Member code sequence is exhausted')
    assert.equal(await Member.countDocuments(), 1)
  })
})

test('member code validation rejects prior formats and incorrect lengths', async () => {
  for (const memberCode of ['BA-0001', 'BA-0001', 'BA001', 'BA10000']) {
    const member = new Member({
      memberCode,
      fullName: 'Test Member',
      fatherName: 'Test Father',
      phone: '+919876543215',
    })
    await assert.rejects(member.validate(), (error) => Boolean(error.errors.memberCode))
  }
})

test('member codes remain unchanged when records are updated', async () => {
  const member = await Member.create({
    memberCode: 'BA0042',
    fullName: 'Existing Member',
    fatherName: 'Existing Father',
    phone: '+919876543215',
  })

  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const response = await fetch(`${baseUrl}/api/v1/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ fullName: 'Existing Updated' }),
    })
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.data.member.memberCode, 'BA0042')
    assert.equal((await Member.findById(member.id)).memberCode, 'BA0042')
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

test('member full and father names are required and old name fields are rejected', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const missingFatherName = await createMember(baseUrl, cookie, { fatherName: '' })
    const missingFatherBody = await missingFatherName.json()
    assert.equal(missingFatherName.status, 400)
    assert.ok(missingFatherBody.errors.some((issue) => issue.field === 'fatherName'))

    const missingFullName = await createMember(baseUrl, cookie, { fullName: '' })
    const missingFullBody = await missingFullName.json()
    assert.equal(missingFullName.status, 400)
    assert.ok(missingFullBody.errors.some((issue) => issue.field === 'fullName'))

    const oldNameFields = await createMember(baseUrl, cookie, {
      firstName: 'Amina',
      lastName: 'Rahman',
    })
    assert.equal(oldNameFields.status, 400)
    assert.equal(await Member.countDocuments(), 0)
  })
})

test('members without active dependencies can be permanently deleted', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const createdResponse = await createMember(baseUrl, cookie)
    const member = (await createdResponse.json()).data.member

    const response = await fetch(`${baseUrl}/api/v1/members/${member._id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.success, true)
    assert.equal(body.data.memberId, member._id)
    assert.equal(await Member.exists({ _id: member._id }), null)
    assert.deepEqual(
      (await AuditLog.find({ entityId: member._id }).sort({ createdAt: 1 }).lean()).map(
        (log) => log.action,
      ),
      ['member.created', 'member.deleted'],
    )
  })
})

test('deletion is blocked by active memberships and trainer assignments', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const membershipMember = (await (await createMember(baseUrl, cookie)).json()).data.member
    const assignmentMember = (await (await createMember(baseUrl, cookie, {
      fullName: 'Bilal Khan',
      phone: '9876543211',
    })).json()).data.member
    const activeMembership = await createHistoricalRecords(membershipMember, {
      membershipStatus: 'active',
      assignmentStatus: 'ended',
      includePayment: false,
    })
    const activeAssignment = await createHistoricalRecords(assignmentMember, {
      membershipStatus: 'expired',
      assignmentStatus: 'active',
      includePayment: false,
    })

    const responses = await Promise.all([
      fetch(`${baseUrl}/api/v1/members/${membershipMember._id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      }),
      fetch(`${baseUrl}/api/v1/members/${assignmentMember._id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      }),
    ])
    const bodies = await Promise.all(responses.map((response) => response.json()))

    assert.equal(responses[0].status, 409)
    assert.match(bodies[0].message, /active membership/)
    assert.equal(responses[1].status, 409)
    assert.match(bodies[1].message, /active trainer assignment/)
    assert.ok(await Member.exists({ _id: membershipMember._id }))
    assert.ok(await Member.exists({ _id: assignmentMember._id }))
    assert.equal((await Membership.findById(activeMembership.membership._id)).memberSnapshot, undefined)
    assert.equal((await TrainerAssignment.findById(activeAssignment.assignment._id)).memberSnapshot, undefined)
  })
})

test('deletion preserves payment, audit, membership and assignment history with name snapshots', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const member = (await (await createMember(baseUrl, cookie)).json()).data.member
    const { membership, assignment, payment } = await createHistoricalRecords(
      { _id: member._id },
    )
    const paymentAuditCount = await AuditLog.countDocuments({ entityId: payment._id })

    const deleteResponse = await fetch(`${baseUrl}/api/v1/members/${member._id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
    assert.equal(deleteResponse.status, 200)
    assert.equal(await Member.exists({ _id: member._id }), null)
    assert.equal(await Payment.countDocuments({ _id: payment._id }), 1)
    assert.equal(await AuditLog.countDocuments({ entityId: payment._id }), paymentAuditCount)

    for (const [Model, id] of [
      [Membership, membership._id],
      [Payment, payment._id],
      [TrainerAssignment, assignment._id],
    ]) {
      const history = await Model.findById(id).lean()
      assert.equal(history.memberSnapshot.fullName, 'Amina Rahman')
      assert.equal(history.memberSnapshot.fatherName, 'Nadeem Rahman')
      assert.equal(history.memberSnapshot.memberCode, member.memberCode)
      assert.equal(history.memberSnapshot.memberId.toString(), member._id)
    }

    const [membershipDetails, assignmentDetails, paymentDetails] = await Promise.all([
      fetch(`${baseUrl}/api/v1/memberships/${membership._id}`, { headers: { Cookie: cookie } }),
      fetch(`${baseUrl}/api/v1/trainer-assignments/${assignment._id}`, { headers: { Cookie: cookie } }),
      fetch(`${baseUrl}/api/v1/payments/${payment._id}`, { headers: { Cookie: cookie } }),
    ])
    const membershipBody = await membershipDetails.json()
    const assignmentBody = await assignmentDetails.json()
    const paymentBody = await paymentDetails.json()
    assert.equal(membershipBody.data.membership.member, null)
    assert.equal(membershipBody.data.membership.memberSnapshot.fullName, 'Amina Rahman')
    assert.equal(assignmentBody.data.assignment.member, null)
    assert.equal(assignmentBody.data.assignment.memberSnapshot.fullName, 'Amina Rahman')
    assert.equal(paymentBody.data.payment.member, null)
    assert.equal(paymentBody.data.payment.memberSnapshot.fullName, 'Amina Rahman')

    const [membershipHistory, assignmentHistory, paymentHistory] = await Promise.all([
      fetch(`${baseUrl}/api/v1/memberships/member/${member._id}`, { headers: { Cookie: cookie } }),
      fetch(`${baseUrl}/api/v1/trainer-assignments/member/${member._id}?search=Nadeem`, { headers: { Cookie: cookie } }),
      fetch(`${baseUrl}/api/v1/payments/member/${member._id}?search=Amina`, { headers: { Cookie: cookie } }),
    ])
    assert.equal((await membershipHistory.json()).data.memberships.length, 1)
    assert.equal((await assignmentHistory.json()).data.assignments.length, 1)
    assert.equal((await paymentHistory.json()).data.payments.length, 1)
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
    memberCode: 'BA0001',
    fullName: 'Test Duplicate',
    fatherName: 'Test Father',
    phone: '+919876543210',
  })

  await assert.rejects(
    Member.create({
      memberCode: member.memberCode,
      fullName: 'Other Member',
      fatherName: 'Other Father',
      phone: '+919876543211',
    }),
    (error) => error.code === 11000,
  )
  assert.equal(await Member.countDocuments({ memberCode: member.memberCode }), 1)
})

test('members can be searched, filtered and paginated', async () => {
  await Member.create([
    {
      memberCode: 'BA0001',
      fullName: 'Amina Rahman',
      fatherName: 'Nadeem Rahman',
      phone: '+919876543210',
      status: 'active',
    },
    {
      memberCode: 'BA0002',
      fullName: 'Bilal Khan',
      fatherName: 'Yusuf Khan',
      phone: '+919876543211',
      status: 'inactive',
    },
    {
      memberCode: 'BA0003',
      fullName: 'Amina Shah',
      fatherName: 'Nadeem Shah',
      phone: '+919876543212',
      status: 'active',
    },
  ])

  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    const response = await fetch(
      `${baseUrl}/api/v1/members?page=1&limit=1&search=amina&status=active&sortBy=fullName&sortOrder=asc`,
      { headers: { Cookie: cookie } },
    )
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.data.members.length, 1)
    assert.equal(body.data.pagination.page, 1)
    assert.equal(body.data.pagination.limit, 1)
    assert.equal(body.data.pagination.total, 2)
    assert.equal(body.data.pagination.totalPages, 2)
    assert.equal(body.data.members[0].fullName, 'Amina Rahman')
    const fatherSearchResponse = await fetch(
      `${baseUrl}/api/v1/members?page=1&limit=10&search=yusuf`,
      { headers: { Cookie: cookie } },
    )
    const fatherSearchBody = await fatherSearchResponse.json()
    assert.equal(fatherSearchBody.data.pagination.total, 1)
    assert.equal(fatherSearchBody.data.members[0].fullName, 'Bilal Khan')

    const codeSearchResponse = await fetch(
      `${baseUrl}/api/v1/members?page=1&limit=10&search=BA0002`,
      { headers: { Cookie: cookie } },
    )
    const codeSearchBody = await codeSearchResponse.json()
    assert.equal(codeSearchBody.data.pagination.total, 1)
    assert.equal(codeSearchBody.data.members[0].fullName, 'Bilal Khan')

    const codeSortResponse = await fetch(
      `${baseUrl}/api/v1/members?page=1&limit=10&sortBy=memberCode&sortOrder=desc`,
      { headers: { Cookie: cookie } },
    )
    const codeSortBody = await codeSortResponse.json()
    assert.deepEqual(
      codeSortBody.data.members.map((member) => member.memberCode),
      ['BA0003', 'BA0002', 'BA0001'],
    )
  })
})

test('member details and updates preserve member code and record audit events', async () => {
  const member = await Member.create({
    memberCode: 'BA0004',
    fullName: 'Omar Ali',
    fatherName: 'Hassan Ali',
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
    assert.equal(detailBody.data.member.fullName, 'Omar Ali')
    assert.equal(detailBody.data.member.fatherName, 'Hassan Ali')

    const updateResponse = await fetch(`${baseUrl}/api/v1/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        fullName: 'Omaruddin Ali',
        fatherName: 'Hassan Updated',
        email: 'OMAR@example.test',
      }),
    })
    const updateBody = await updateResponse.json()
    assert.equal(updateResponse.status, 200)
    assert.equal(updateBody.data.member.fullName, 'Omaruddin Ali')
    assert.equal(updateBody.data.member.fatherName, 'Hassan Updated')
    assert.equal(updateBody.data.member.email, 'omar@example.test')
    assert.equal(updateBody.data.member.memberCode, member.memberCode)

    const log = await AuditLog.findOne({
      entityId: member._id,
      action: 'member.updated',
    }).lean()
    assert.ok(log)
    assert.deepEqual(log.metadata.changedFields, ['fullName', 'fatherName', 'email'])
  })
})

test('members can be deactivated and reactivated with audit history', async () => {
  assert.deepEqual(Member.schema.path('status').enumValues, ['active', 'inactive'])
  const member = await Member.create({
    memberCode: 'BA0005',
    fullName: 'Sara Noor',
    fatherName: 'Mustafa Noor',
    phone: '+919876543214',
  })

  await withServer(createTestApp(), async (baseUrl) => {
    const cookie = await login(baseUrl)
    for (const status of ['inactive', 'active']) {
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
      ['member.deactivated', 'member.reactivated'],
    )
  })
})

test('member endpoints require an authenticated admin', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/api/v1/members`),
      fetch(`${baseUrl}/api/v1/members/0123456789abcdef01234567`),
      fetch(`${baseUrl}/api/v1/members/0123456789abcdef01234567`, { method: 'DELETE' }),
      fetch(`${baseUrl}/api/v1/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Unauthorized Member',
          fatherName: 'Unauthorized Father',
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
