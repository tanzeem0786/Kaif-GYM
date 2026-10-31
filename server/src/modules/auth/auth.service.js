import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ApiError } from '../../utils/ApiError.js'

const DUMMY_PASSWORD_HASH = '$2b$12$ik9o4KQQYVoEmebrB0SeDOTavwKlwqwKAJBTh7q0KBleAhzYI3O.a'
const TOKEN_ISSUER = 'kaifs-gym-api'
const TOKEN_AUDIENCE = 'kaifs-gym-admin'

export function toAdminProfile(admin) {
  return {
    id: admin.id ?? admin._id.toString(),
    name: admin.name,
    email: admin.email,
  }
}

export function createAuthService({ AdminModel, jwtSecret, jwtExpiresIn }) {
  return {
    async login({ email, password }) {
      const admin = await AdminModel.findOne({ email }).select('+passwordHash')
      const passwordMatches = await bcrypt.compare(
        password,
        admin?.passwordHash ?? DUMMY_PASSWORD_HASH,
      )

      if (!admin || !admin.isActive || !passwordMatches) {
        throw new ApiError(401, 'Invalid email or password')
      }

      const token = jwt.sign(
        {},
        jwtSecret,
        {
          algorithm: 'HS256',
          subject: admin.id ?? admin._id.toString(),
          issuer: TOKEN_ISSUER,
          audience: TOKEN_AUDIENCE,
          expiresIn: jwtExpiresIn,
        },
      )

      return { admin: toAdminProfile(admin), token }
    },

    verifyToken(token) {
      return jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
      })
    },
  }
}

export { TOKEN_AUDIENCE, TOKEN_ISSUER }
