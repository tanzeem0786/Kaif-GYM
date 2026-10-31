import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEnvironment } from '../src/configs/environment.js'

const validEnvironment = {
  NODE_ENV: 'test',
  PORT: '5000',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/kaifs_gym',
  JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
  JWT_EXPIRES_IN: '1d',
  COOKIE_NAME: 'kaifs_gym_token',
  COOKIE_SECURE: 'false',
  COOKIE_SAME_SITE: 'lax',
  CLIENT_URL: 'http://localhost:5173',
  CORS_ORIGIN: 'http://localhost:5173, https://admin.example.com',
}

test('parses valid environment values and normalizes configured origins', () => {
  const config = parseEnvironment(validEnvironment)

  assert.equal(config.PORT, 5000)
  assert.equal(config.COOKIE_SECURE, false)
  assert.equal(config.JWT_EXPIRES_IN, 86400)
  assert.deepEqual(config.CORS_ORIGIN, [
    'http://localhost:5173',
    'https://admin.example.com',
  ])
})

test('reports required environment variables without revealing values', () => {
  const { MONGODB_URI, ...incompleteEnvironment } = validEnvironment

  assert.throws(
    () => parseEnvironment(incompleteEnvironment),
    (error) => {
      assert.match(error.message, /MONGODB_URI: is required/)
      assert.doesNotMatch(error.message, /test-secret/)
      return true
    },
  )
})

test('rejects invalid ports and MongoDB URIs', () => {
  assert.throws(
    () => parseEnvironment({ ...validEnvironment, PORT: '70000' }),
    /PORT:/,
  )
  assert.throws(
    () => parseEnvironment({ ...validEnvironment, MONGODB_URI: 'https://db.example.com' }),
    /MONGODB_URI:/,
  )
  assert.throws(
    () => parseEnvironment({ ...validEnvironment, JWT_EXPIRES_IN: 'yesterday' }),
    /JWT_EXPIRES_IN:/,
  )
})

test('rejects unapproved origins and insecure SameSite=None cookies', () => {
  assert.throws(
    () => parseEnvironment({ ...validEnvironment, CORS_ORIGIN: 'https://other.example.com' }),
    /must include the CLIENT_URL origin/,
  )
  assert.throws(
    () =>
      parseEnvironment({
        ...validEnvironment,
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'false',
      }),
    /COOKIE_SECURE: must be true/,
  )

  assert.throws(
    () => parseEnvironment({ ...validEnvironment, NODE_ENV: 'production' }),
    /COOKIE_SECURE: must be true in production/,
  )
})
