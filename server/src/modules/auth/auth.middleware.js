import { ApiError } from '../../utils/ApiError.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { toAdminProfile } from './auth.service.js'

export function createAuthenticate({ AdminModel, authService, cookieName }) {
  return asyncHandler(async (req, res, next) => {
    const token = req.cookies?.[cookieName]

    if (!token) {
      throw new ApiError(401, 'Authentication required')
    }

    let payload
    try {
      payload = authService.verifyToken(token)
    } catch {
      throw new ApiError(401, 'Authentication required')
    }

    const admin = await AdminModel.findById(payload.sub)
    if (!admin || !admin.isActive) {
      throw new ApiError(401, 'Authentication required')
    }

    req.admin = toAdminProfile(admin)
    next()
  })
}
