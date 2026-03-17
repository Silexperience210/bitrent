/**
 * GET /api/mineurs
 * List all available miners
 */
import { getMiners } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mineurs = await getMiners();

    res.status(200).json({
      status: 'ok',
      count: mineurs.length,
      data: mineurs
    });
  } catch (error) {
    console.error('Error fetching mineurs:', error);
    res.status(500).json({
      error: 'Failed to fetch miners',
      code: 'MINEURS_ERROR'
    });
  }
}
