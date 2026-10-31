import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { createAuthService } from './auth.service.js'

export function createAuthController({ AdminModel, authConfig }) {
  const authService = createAuthService({
    AdminModel,
    jwtSecret: authConfig.JWT_SECRET,
    jwtExpiresIn: authConfig.JWT_EXPIRES_IN,
  })
  const cookieOptions = {
    httpOnly: true,
    secure: authConfig.COOKIE_SECURE,
    sameSite: authConfig.COOKIE_SAME_SITE,
    path: '/',
  }

  return {
    authService,

    login: asyncHandler(async (req, res) => {
      const { admin, token } = await authService.login(req.body)
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
