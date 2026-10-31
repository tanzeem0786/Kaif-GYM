import mongoose from 'mongoose'

export async function connectDatabase(uri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    mongoose.connection.on('error', (error) => {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'MongoDB connection error',
          errorName: error.name,
        }),
      )
    })
  } catch (error) {
    throw new Error(
      `MongoDB connection failed (${error.name}). Check MONGODB_URI and confirm the database is reachable.`,
      { cause: error },
    )
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}

export function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }

  return states[mongoose.connection.readyState] ?? 'unknown'
}
