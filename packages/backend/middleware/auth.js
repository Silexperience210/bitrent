import jwt from 'jsonwebtoken';
import config from '../config/env.js';

export const verifyJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.pubkey !== config.admin.nostrPubkey) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

export const optionalJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
    } catch (error) {
      // Token is invalid, but we don't require it - just log it
      console.warn('Invalid token provided:', error.message);
    }
  }

  next();
};

export default {
  verifyJWT,
  requireAdmin,
  optionalJWT,
};
