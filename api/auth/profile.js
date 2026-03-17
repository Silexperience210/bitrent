import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bitrent-dev-secret';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    // Return user profile
    res.status(200).json({
      status: 'ok',
      data: {
        pubkey: decoded.pubkey,
        authenticated: true,
        expires_at: new Date(decoded.exp * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
