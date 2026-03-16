/**
 * Test Endpoint
 * GET /api/test
 * Returns API configuration status
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const config = {
    environment: process.env.NODE_ENV,
    supabase: {
      url: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
      serviceKey: process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing',
      anonKey: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'
    },
    payments: {
      nwcConnection: process.env.NWC_CONNECTION_STRING ? '✅ Set' : '❌ Missing'
    },
    node: {
      version: process.version,
      platform: process.platform
    }
  };

  res.status(200).json(config);
}
