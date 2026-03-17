import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d'

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long')
}

export function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: 'bitrent',
    algorithm: 'HS256',
  })
}

export function verify(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'bitrent',
      algorithms: ['HS256'],
    })
  } catch {
    return null
  }
}

export function fromHeader(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}
