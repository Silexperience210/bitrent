/**
 * POST /api/auth/challenge
 * Get a challenge for Nostr authentication
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Generate a challenge that client will sign
  const challenge = {
    id: `challenge_${Date.now()}`,
    timestamp: new Date().toISOString(),
    message: 'Sign this message to authenticate with BitRent',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  };

  res.status(200).json({
    status: 'ok',
    challenge
  });
}
