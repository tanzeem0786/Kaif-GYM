import { ApiError } from '../../utils/ApiError.js'
import { bootstrapAdminSchema } from './auth.validation.js'

export async function bootstrapAdmin(input, AdminModel) {
  const credentials = bootstrapAdminSchema.parse(input)
  const existingAdmin = await AdminModel.exists({})

  if (existingAdmin) {
    throw new ApiError(409, 'An admin account already exists')
  }

  try {
    const admin = await AdminModel.createWithPassword(credentials)
    return {
      id: admin.id ?? admin._id.toString(),
      name: admin.name,
      email: admin.email,
    }
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'An admin account already exists')
    }

    throw error
  }
}
