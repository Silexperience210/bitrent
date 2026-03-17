import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bitrent-dev-secret';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { challenge_id, signature, pubkey, event } = req.body;

    if (!challenge_id || !signature || !pubkey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // In production, verify the Nostr signature (NIP-98)
    // For now, we'll accept any valid pubkey
    if (!pubkey.match(/^[a-f0-9]{64}$/)) {
      return res.status(400).json({ error: 'Invalid public key format' });
    }

    // Create JWT token for user session
    const token = jwt.sign(
      {
        pubkey: pubkey,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days
      },
      JWT_SECRET,
      { algorithm: 'HS256' }
    );

    res.status(200).json({
      status: 'ok',
      token: token,
      pubkey: pubkey,
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
