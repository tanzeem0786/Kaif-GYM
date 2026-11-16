import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import test from 'node:test'
import { errorHandler } from '../src/middlewares/errorHandler.js'
import { ApiError } from '../src/utils/ApiError.js'

function createResponse() {
  return {
    statusCode: undefined,
    body: undefined,
    status(statusCode) {
      this.statusCode = statusCode
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('central error handler returns known API errors consistently', () => {
  const response = createResponse()

  errorHandler(new ApiError(409, 'Resource conflict', [{ field: 'name', message: 'Already exists' }]), {}, response, assert.fail)

  assert.equal(response.statusCode, 409)
  assert.deepEqual(response.body, {
    success: false,
    message: 'Resource conflict',
    errors: [{ field: 'name', message: 'Already exists' }],
  })
})

test('central error handler returns Mongoose validation errors as bad requests', () => {
  const response = createResponse()
  const error = new mongoose.Error.ValidationError()
  error.addError(
    'membershipCode',
    new mongoose.Error.ValidatorError({
      path: 'membershipCode',
      message: 'Path `membershipCode` is invalid.',
    }),
  )

  errorHandler(error, {}, response, assert.fail)

  assert.equal(response.statusCode, 400)
  assert.deepEqual(response.body, {
    success: false,
    message: 'Request validation failed',
    errors: [{ field: 'membershipCode', message: 'Path `membershipCode` is invalid.' }],
  })
})

test('central error handler masks unexpected error details', () => {
  const response = createResponse()
  const originalError = console.error
  let loggedOutput = ''
  console.error = (message) => {
    loggedOutput += message
  }

  try {
    errorHandler(new Error('private connection string'), {}, response, assert.fail)
  } finally {
    console.error = originalError
  }

  assert.equal(response.statusCode, 500)
  assert.deepEqual(response.body, {
    success: false,
    message: 'Internal server error',
    errors: [],
  })
  assert.doesNotMatch(loggedOutput, /private connection string/)
})
