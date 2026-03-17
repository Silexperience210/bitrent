/**
 * GET /api/mineurs/[id]
 * Get a specific miner
 */
import { getMinerById } from '../lib/supabase.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      error: 'Miner ID is required',
      code: 'MISSING_ID'
    });
  }

  try {
    if (req.method === 'GET') {
      const miner = await getMinerById(id);

      if (!miner) {
        return res.status(404).json({
          error: 'Miner not found',
          code: 'MINER_NOT_FOUND'
        });
      }

      res.status(200).json({
        status: 'ok',
        data: miner
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error fetching miner:', error);
    res.status(500).json({
      error: 'Failed to fetch miner',
      code: 'MINER_ERROR'
    });
  }
}
