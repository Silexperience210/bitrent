/**
 * POST /api/auth/verify
 * Verify Nostr signature and return JWT token
 */
import { verifySignature } from 'nostr-tools';
import { generateToken } from '../lib/jwt.js';
import { getUserByNostrPubkey, createUser } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event } = req.body;

    if (!event) {
      return res.status(400).json({
        error: 'Missing event in request body',
        code: 'MISSING_EVENT'
      });
    }

    // Verify the Nostr event signature
    if (!verifySignature(event)) {
      return res.status(401).json({
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE'
      });
    }

    const nostrPubkey = event.pubkey;

    // Check if user exists in database
    let user = await getUserByNostrPubkey(nostrPubkey);

    // Create user if doesn't exist
    if (!user) {
      user = await createUser(nostrPubkey, `User-${nostrPubkey.slice(0, 8)}`);
    }

    // Generate JWT token
    const token = generateToken(user.id, nostrPubkey, user.role);

    res.status(200).json({
      status: 'ok',
      token,
      user: {
        id: user.id,
        nostr_pubkey: user.nostr_pubkey,
        display_name: user.display_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
      message: error.message
    });
  }
}
