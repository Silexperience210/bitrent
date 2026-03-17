/**
 * POST /api/rentals
 * Create a new rental
 * Requires: Authorization header with Nostr signature
 */
import { verifyToken } from '../lib/jwt.js';
import { createRental, getMinerById } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract and verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    const { miner_id, start_time } = req.body;

    if (!miner_id || !start_time) {
      return res.status(400).json({
        error: 'Missing required fields: miner_id, start_time',
        code: 'MISSING_FIELDS'
      });
    }

    // Verify miner exists and is online
    const miner = await getMinerById(miner_id);
    if (!miner) {
      return res.status(404).json({
        error: 'Miner not found',
        code: 'MINER_NOT_FOUND'
      });
    }

    if (miner.status !== 'online') {
      return res.status(400).json({
        error: 'Miner is not available',
        code: 'MINER_UNAVAILABLE'
      });
    }

    // Create rental
    const rental = await createRental(miner_id, decoded.userId, start_time);

    res.status(201).json({
      status: 'ok',
      data: rental
    });
  } catch (error) {
    console.error('Error creating rental:', error);
    res.status(500).json({
      error: 'Failed to create rental',
      code: 'RENTAL_ERROR',
      message: error.message
    });
  }
}
