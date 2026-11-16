import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { loginAdmin } from './auth.service.js'

export function createAuthController(authConfig) {
  const cookieOptions = {
    httpOnly: true,
    secure: authConfig.COOKIE_SECURE,
    sameSite: authConfig.COOKIE_SAME_SITE,
    path: '/',
  }

  return {
    login: asyncHandler(async (req, res) => {
      const { admin, token } = await loginAdmin(
        req.body,
        authConfig.JWT_SECRET,
        authConfig.JWT_EXPIRES_IN,
      )
      res.cookie(authConfig.COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: authConfig.JWT_EXPIRES_IN * 1000,
      })
      sendSuccess(res, { admin }, 'Login successful')
    }),

    logout(req, res) {
      res.clearCookie(authConfig.COOKIE_NAME, cookieOptions)
      sendSuccess(res, null, 'Logout successful')
    },

    me(req, res) {
      sendSuccess(res, { admin: req.admin }, 'Authenticated admin')
    },
  }
}
