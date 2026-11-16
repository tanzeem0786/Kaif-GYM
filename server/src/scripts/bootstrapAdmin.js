import { emitKeypressEvents } from 'node:readline'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { connectDatabase, disconnectDatabase } from '../configs/database.js'
import { parseEnvironment } from '../configs/environment.js'
import { Admin } from '../modules/auth/admin.model.js'
import { bootstrapAdmin } from '../modules/auth/admin.service.js'

function promptHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Admin bootstrap requires an interactive terminal for password input.')
  }

  emitKeypressEvents(stdin)
  const wasRaw = stdin.isRaw
  stdin.setRawMode(true)
  stdin.resume()
  stdout.write(prompt)

  return new Promise((resolve, reject) => {
    let value = ''

    function cleanup() {
      stdin.removeListener('keypress', onKeypress)
      stdin.setRawMode(wasRaw)
      stdout.write('\n')
    }

    function onKeypress(character, key = {}) {
      if (key.ctrl && key.name === 'c') {
        cleanup()
        reject(new Error('Admin bootstrap cancelled.'))
        return
      }

      if (key.name === 'return' || key.name === 'enter') {
        cleanup()
        resolve(value)
        return
      }

      if (key.name === 'backspace') {
        if (value.length > 0) {
          value = value.slice(0, -1)
          stdout.write('\b \b')
        }
        return
      }

      if (!key.ctrl && !key.meta && character) {
        value += character
        stdout.write('*')
      }
    }

    stdin.on('keypress', onKeypress)
  })
}

async function main() {
  const config = parseEnvironment()
  await connectDatabase(config.MONGODB_URI)

  try {
    await Admin.init()
    if (await Admin.exists({})) {
      throw new Error('An admin account already exists.')
    }

    const terminal = createInterface({ input: stdin, output: stdout })
    let name
    let email
    try {
      name = await terminal.question('Admin name: ')
      email = await terminal.question('Admin email: ')
    } finally {
      terminal.close()
    }

    const password = await promptHidden('Admin password (minimum 12 characters): ')
    const confirmation = await promptHidden('Confirm password: ')
    if (password !== confirmation) {
      throw new Error('Passwords do not match.')
    }

    const admin = await bootstrapAdmin({ name, email, password })
    stdout.write(`Admin account created for ${admin.email}.\n`)
  } finally {
    await disconnectDatabase()
  }
}

main().catch((error) => {
  const message =
    error.name === 'ValidationError'
      ? `Admin validation failed: ${Object.values(error.errors)
          .map(({ path, message: detail }) => `${path}: ${detail}`)
          .join('; ')}`
      : error.message
  console.error(message)
  process.exitCode = 1
})
