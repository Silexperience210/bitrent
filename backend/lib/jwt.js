import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

export function generateToken(userId, nostrPubkey, role = 'user') {
  return jwt.sign(
    {
      userId,
      nostrPubkey,
      role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function decodeToken(token) {
  return jwt.decode(token);
}

export function isTokenValid(token) {
  const decoded = verifyToken(token);
  return decoded !== null;
}
