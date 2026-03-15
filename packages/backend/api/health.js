/**
 * GET /api/health
 * Health check endpoint (no auth required)
 */

import { handleCors } from '@/lib/cors.js';
import { supabase } from '@/lib/supabase.js';

export default async function handler(req, res) {
  // Handle CORS
  if (await handleCors(req, res)) {
    return;
  }

  // Method check
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'MethodNotAllowed',
      message: 'Method not allowed',
    });
  }

  try {
    // Check database connection
    const { data, error } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true });

    const dbHealthy = !error;

    return res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'unknown',
    });
  } catch (error) {
    console.error('[HEALTH] Health check error:', error);

    return res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
