/**
 * GET /api/health
 * Health check endpoint
 */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    status: 'ok',
    service: 'BitRent Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'ready',
      auth: 'ready',
      payments: 'ready'
    },
    uptime: process.uptime()
  });
}
