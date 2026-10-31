import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { createGracefulShutdown } from '../src/utils/gracefulShutdown.js'

test('graceful shutdown closes HTTP and database resources once', async () => {
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  let disconnectCount = 0
  const shutdown = createGracefulShutdown({
    server,
    disconnectDatabase: async () => {
      disconnectCount += 1
    },
    logger: { info() {}, error() {} },
  })

  await Promise.all([shutdown('SIGTERM'), shutdown('SIGTERM')])

  assert.equal(server.listening, false)
  assert.equal(disconnectCount, 1)
})
