import { ApiError } from '../../utils/ApiError.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { Admin } from './admin.model.js'
import { toAdminProfile, verifyAdminToken } from './auth.service.js'

export function createAuthenticate({ cookieName, jwtSecret }) {
  return asyncHandler(async (req, res, next) => {
    const token = req.cookies?.[cookieName]

    if (!token) {
      throw new ApiError(401, 'Authentication required')
    }

    let payload
    try {
      payload = verifyAdminToken(token, jwtSecret)
    } catch {
      throw new ApiError(401, 'Authentication required')
    }

    const admin = await Admin.findById(payload.sub)
    if (!admin || !admin.isActive) {
      throw new ApiError(401, 'Authentication required')
    }

    req.admin = toAdminProfile(admin)
    next()
  })
}
