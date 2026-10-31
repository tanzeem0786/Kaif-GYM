import assert from 'node:assert/strict'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { getHealthStatus } from '../src/services/health.service.js'

async function withServer(app, run) {
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  try {
    const address = server.address()
    await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

test('health service reports database connectivity accurately', () => {
  assert.deepEqual(getHealthStatus('connected'), {
    status: 'ok',
    database: { status: 'connected' },
  })
  assert.deepEqual(getHealthStatus('connecting'), {
    status: 'unavailable',
    database: { status: 'connecting' },
  })
})

test('API base route and connected health check return success responses', async () => {
  const app = createApp({
    allowedOrigins: ['http://localhost:5173'],
    getDatabaseState: () => 'connected',
  })

  await withServer(app, async (baseUrl) => {
    const apiResponse = await fetch(`${baseUrl}/api/v1`)
    assert.equal(apiResponse.status, 200)
    assert.deepEqual(await apiResponse.json(), {
      success: true,
      message: "Kaif's GYM API is available",
      data: { apiVersion: 'v1' },
    })

    const healthResponse = await fetch(`${baseUrl}/api/v1/health`)
    assert.equal(healthResponse.status, 200)
    assert.deepEqual((await healthResponse.json()).data, {
      status: 'ok',
      database: { status: 'connected' },
    })
  })
})

test('health check reports database unavailability with HTTP 503', async () => {
  const app = createApp({
    allowedOrigins: ['http://localhost:5173'],
    getDatabaseState: () => 'disconnected',
  })

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`)
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), {
      success: false,
      message: 'Service unavailable',
      errors: [],
      data: {
        status: 'unavailable',
        database: { status: 'disconnected' },
      },
    })
  })
})

test('unknown routes and malformed JSON use consistent error responses', async () => {
  const app = createApp({
    allowedOrigins: ['http://localhost:5173'],
    getDatabaseState: () => 'connected',
  })

  await withServer(app, async (baseUrl) => {
    const missingResponse = await fetch(`${baseUrl}/api/v1/not-a-route`)
    assert.equal(missingResponse.status, 404)
    assert.deepEqual(await missingResponse.json(), {
      success: false,
      message: 'Route not found',
      errors: [],
    })

    const invalidBodyResponse = await fetch(`${baseUrl}/api/v1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })
    assert.equal(invalidBodyResponse.status, 400)
    assert.deepEqual(await invalidBodyResponse.json(), {
      success: false,
      message: 'Invalid JSON request body',
      errors: [],
    })
  })
})

test('CORS allows configured origins and omits access for unconfigured origins', async () => {
  const app = createApp({
    allowedOrigins: ['http://localhost:5173'],
    getDatabaseState: () => 'connected',
  })

  await withServer(app, async (baseUrl) => {
    const allowedResponse = await fetch(`${baseUrl}/api/v1`, {
      headers: { Origin: 'http://localhost:5173' },
    })
    assert.equal(allowedResponse.headers.get('access-control-allow-origin'), 'http://localhost:5173')

    const blockedResponse = await fetch(`${baseUrl}/api/v1`, {
      headers: { Origin: 'https://unapproved.example.com' },
    })
    assert.equal(blockedResponse.headers.get('access-control-allow-origin'), null)
  })
})
